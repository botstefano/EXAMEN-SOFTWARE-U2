"""ETL, reportes, RAG, auditoría, campañas, threat hunting y cumplimiento."""
import hashlib, uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from pydantic import BaseModel
from sqlalchemy import func, select, text
from app.core.utils import ser
from app.deps import DB, audit, require
from app.models import (AuditLog, Campaign, CampaignTarget, DatasetVersion, Detection, Incident, Indicator)
from app.modules.etl import service as etl
from app.modules.rag import service as rag
from app.modules.reporting import service as rep

etl_router, reports_router, rag_router = APIRouter(), APIRouter(), APIRouter()
audit_router, camp_router, hunt_router, comp_router = APIRouter(), APIRouter(), APIRouter(), APIRouter()


# ---- ETL ----
class EtlIn(BaseModel):
    source: str


@etl_router.post("/run")
async def run_etl(body: EtlIn, db: DB, request: Request, actor=Depends(require("etl:execute"))):
    try:
        res = await etl.run(db, body.source)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(502, f"Error al descargar la fuente: {e}")
    await audit(db, actor, "etl.execute", "dataset_versions", res["version_id"], res, request)
    return res


@etl_router.get("/versions")
async def versions(db: DB, _=Depends(require("etl:read"))):
    q = select(DatasetVersion).order_by(DatasetVersion.ingested_at.desc()).limit(50)
    return [ser(v) for v in (await db.execute(q)).scalars()]


# ---- Reportes ----
@reports_router.get("/{rtype}")
async def report(rtype: str, db: DB, format: str = Query("pdf", pattern="^(pdf|docx|xlsx)$"),
                 incident_id: str | None = None, month: str | None = None, _=Depends(require("report:generate"))):
    try:
        data = await rep.build_data(db, rtype, {"incident_id": incident_id, "month": month})
        content, mime = rep.render(format, data)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return Response(content, media_type=mime, headers={"Content-Disposition": f'attachment; filename="{rtype}.{format}"'})


# ---- RAG ----
class RagQ(BaseModel):
    question: str
    top_k: int = 5


class RagIdx(BaseModel):
    title: str
    content: str
    category: str
    source_url: str | None = None


@rag_router.post("/query")
async def rag_query(body: RagQ, db: DB, _=Depends(require("soc:assistant"))):
    return await rag.answer(db, body.question, body.top_k)


@rag_router.post("/index")
async def rag_index(body: RagIdx, db: DB, _=Depends(require("soc:assistant"))):
    return await rag.index_document(db, body.title, body.content, body.category, body.source_url)


# ---- Auditoría ----
@audit_router.get("")
async def list_audit(db: DB, actor_email: str | None = None, action: str | None = None, resource: str | None = None,
                     limit: int = Query(100, le=500), offset: int = 0, _=Depends(require("audit:read"))):
    q = select(AuditLog).order_by(AuditLog.created_at.desc())
    for col, v in ((AuditLog.actor_email, actor_email), (AuditLog.action, action), (AuditLog.resource, resource)):
        if v:
            q = q.where(col == v)
    return [ser(a) for a in (await db.execute(q.limit(limit).offset(offset))).scalars()]


# ---- Campañas ----
def email_hash(e: str) -> str:
    return hashlib.sha256(e.strip().lower().encode()).hexdigest()


async def metrics(db, cid):
    r = (await db.execute(select(func.count(), func.count(CampaignTarget.clicked_at), func.count(CampaignTarget.reported_at))
                          .where(CampaignTarget.campaign_id == cid))).one()
    t = r[0] or 0
    return {"sent": t, "clicked": r[1], "reported": r[2], "click_rate": round(r[1] / t, 4) if t else 0.0,
            "report_rate": round(r[2] / t, 4) if t else 0.0}


class CampIn(BaseModel):
    name: str
    template: dict = {}
    scheduled_at: datetime | None = None


class TargetsIn(BaseModel):
    emails: list[str]
    department: str | None = None


class TrackIn(BaseModel):
    email: str
    event: str


@camp_router.get("")
async def list_camps(db: DB, _=Depends(require("report:read"))):
    cs = (await db.execute(select(Campaign).order_by(Campaign.created_at.desc()))).scalars().all()
    return [{**ser(c), "metrics": await metrics(db, c.id)} for c in cs]


@camp_router.post("", status_code=201)
async def create_camp(body: CampIn, db: DB, request: Request, actor=Depends(require("user:manage"))):
    c = Campaign(name=body.name, template=body.template, scheduled_at=body.scheduled_at)
    db.add(c)
    await db.flush()
    await db.refresh(c)
    await audit(db, actor, "campaign.create", "phishing_campaigns", c.id, request=request)
    return {**ser(c), "metrics": {}}


async def _camp(db, cid):
    c = await db.get(Campaign, cid)
    if not c:
        raise HTTPException(404, "Campaña no encontrada")
    return c


@camp_router.post("/{cid}/targets")
async def targets(cid: uuid.UUID, body: TargetsIn, db: DB, _=Depends(require("user:manage"))):
    await _camp(db, cid)
    ins = skip = 0
    for e in body.emails:
        h = email_hash(e)
        if (await db.execute(select(CampaignTarget.id).where(CampaignTarget.campaign_id == cid, CampaignTarget.user_email_hash == h))).first():
            skip += 1
        else:
            db.add(CampaignTarget(campaign_id=cid, user_email_hash=h, department=body.department))
            ins += 1
    return {"inserted": ins, "skipped": skip}


@camp_router.post("/{cid}/launch")
async def launch(cid: uuid.UUID, db: DB, request: Request, actor=Depends(require("user:manage"))):
    c = await _camp(db, cid)
    if c.status not in ("draft", "scheduled"):
        raise HTTPException(400, f"Estado inválido para lanzar: {c.status}")
    now = datetime.now(timezone.utc)
    ts = (await db.execute(select(CampaignTarget).where(CampaignTarget.campaign_id == cid, CampaignTarget.sent_at.is_(None)))).scalars().all()
    for t in ts:
        t.sent_at = now
    c.status, c.launched_at = "running", now
    await audit(db, actor, "campaign.launch", "phishing_campaigns", cid, {"targets": len(ts)}, request)
    return {"launched": len(ts), "campaign_id": str(cid)}


@camp_router.post("/{cid}/track")
async def track(cid: uuid.UUID, body: TrackIn, db: DB, _=Depends(require("user:manage"))):
    if body.event not in ("click", "report"):
        raise HTTPException(400, "Evento inválido")
    t = (await db.execute(select(CampaignTarget).where(CampaignTarget.campaign_id == cid, CampaignTarget.user_email_hash == email_hash(body.email)))).scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Target no encontrado")
    now = datetime.now(timezone.utc)
    if body.event == "click" and not t.clicked_at: t.clicked_at = now
    if body.event == "report" and not t.reported_at: t.reported_at = now
    return {"ok": True}


@camp_router.get("/{cid}/metrics")
async def camp_metrics(cid: uuid.UUID, db: DB, _=Depends(require("report:read"))):
    await _camp(db, cid)
    return await metrics(db, cid)


# ---- Threat hunting ----
@hunt_router.get("/search")
async def hunt(db: DB, verdict: str | None = None, channel: str | None = None, min_confidence: float | None = None,
               since_days: int = Query(30, ge=1, le=365), url_like: str | None = None, limit: int = Query(100, le=500),
               offset: int = 0, _=Depends(require("detection:read"))):
    q = select(Detection).where(Detection.detected_at >= datetime.now(timezone.utc) - timedelta(days=since_days))
    if verdict: q = q.where(Detection.verdict == verdict)
    if channel: q = q.where(Detection.channel == channel)
    if min_confidence is not None: q = q.where(Detection.confidence >= min_confidence)
    if url_like: q = q.where(Detection.meta["url"].astext.ilike(f"%{url_like}%"))
    rows = (await db.execute(q.order_by(Detection.detected_at.desc()).limit(limit).offset(offset))).scalars().all()
    return [{"id": str(r.id), "verdict": r.verdict, "confidence": float(r.confidence), "channel": r.channel,
             "detected_at": r.detected_at.isoformat(), "url": (r.meta or {}).get("url")} for r in rows]


@hunt_router.get("/correlate")
async def correlate(db: DB, value: str = Query(min_length=3), _=Depends(require("detection:read"))):
    v = value.strip().lower()
    ind = (await db.execute(select(Indicator).where(Indicator.value_normalized.ilike(f"%{v}%")).limit(1))).scalar_one_or_none()
    dets = (await db.execute(text("SELECT id, verdict, detected_at FROM detections WHERE meta::text ILIKE :q "
                                  "ORDER BY detected_at DESC LIMIT 50"), {"q": f"%{v}%"})).all()
    incs = (await db.execute(select(Incident).where(
        Incident.title.ilike(f"%{v}%") | Incident.description.ilike(f"%{v}%") |
        func.array_to_string(Incident.tags, " ").ilike(f"%{v}%")).limit(20))).scalars().all()
    return {"indicator": {"id": str(ind.id) if ind else None, "value": v, "is_active": ind.is_active if ind else False,
                          "hit_count": ind.hit_count if ind else 0},
            "detections": [{"id": str(d[0]), "verdict": d[1], "detected_at": d[2].isoformat()} for d in dets],
            "incidents": [{"id": str(i.id), "title": i.title, "status": i.status} for i in incs]}


@hunt_router.get("/top-sources")
async def top_sources(db: DB, days: int = Query(7, ge=1, le=90), _=Depends(require("detection:read"))):
    rows = (await db.execute(text("SELECT channel, count(*) t FROM detections WHERE verdict='phishing' AND detected_at >= now() - make_interval(days => :d) GROUP BY 1 ORDER BY t DESC"), {"d": days})).all()
    return [{"source": r[0], "total": r[1]} for r in rows]


# ---- Cumplimiento ----
@comp_router.get("/summary")
async def summary(db: DB, period_days: int = Query(90, ge=7, le=365), _=Depends(require("audit:read"))):
    since = datetime.now(timezone.utc) - timedelta(days=period_days)

    async def cnt(model, col, extra=None):
        q = select(func.count()).select_from(model).where(col >= since)
        return (await db.execute(q.where(extra) if extra is not None else q)).scalar_one()
    tot, closed = await cnt(Incident, Incident.created_at), await cnt(Incident, Incident.created_at, Incident.status == "cerrado")
    iocs = (await db.execute(select(func.count()).select_from(Indicator).where(Indicator.is_active))).scalar_one()
    return {"period_days": period_days, "period_start": since.isoformat(),
            "metrics": {"incidents_total": tot, "incidents_closed": closed,
                        "incidents_closure_rate": round(closed / tot, 4) if tot else 0,
                        "audit_events": await cnt(AuditLog, AuditLog.created_at),
                        "detections_total": await cnt(Detection, Detection.detected_at),
                        "datasets_ingested": await cnt(DatasetVersion, DatasetVersion.ingested_at), "iocs_active": iocs},
            "controls": {"audit_trail": True, "rbac_enforced": True, "mfa_available": True, "sla_tracking": True,
                         "password_hashing_bcrypt": True, "account_lockout": True}}


@comp_router.get("/sla")
async def sla(db: DB, period_days: int = Query(30, ge=7, le=365), _=Depends(require("audit:read"))):
    since = datetime.now(timezone.utc) - timedelta(days=period_days)
    tot = (await db.execute(select(func.count()).select_from(Incident).where(Incident.created_at >= since))).scalar_one()
    br = (await db.execute(text("SELECT count(*) FROM incidents WHERE created_at >= :s AND closed_at IS NOT NULL AND closed_at > sla_due_at"), {"s": since})).scalar_one()
    return {"incidents_in_period": tot, "sla_breached": br, "sla_compliance_rate": round(1 - br / tot, 4) if tot else 1.0}


@comp_router.get("/audit/export")
async def audit_export(db: DB, days: int = Query(30, ge=1, le=365), _=Depends(require("audit:read"))):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    q = select(AuditLog).where(AuditLog.created_at >= since).order_by(AuditLog.created_at).limit(10000)
    return [ser(a) for a in (await db.execute(q)).scalars()]
