import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select, update
from app.core.utils import ser
from app.deps import DB, audit, require
from app.models import Detection, Incident, IncidentEvent

router = APIRouter()
SLA_H = {"critica": 0.5, "alta": 2, "media": 8, "baja": 24}
TRANS = {"nuevo": {"triage", "falso_positivo", "cerrado"}, "triage": {"investigacion", "falso_positivo", "cerrado"},
         "investigacion": {"contencion", "falso_positivo", "cerrado"}, "contencion": {"cerrado", "investigacion"},
         "cerrado": {"investigacion"}, "falso_positivo": {"triage"}}


class IncIn(BaseModel):
    title: str
    description: str | None = None
    severity: str
    channel: str
    detection_ids: list[uuid.UUID] = []
    tags: list[str] = []
    assignee_id: uuid.UUID | None = None


class IncPatch(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    severity: str | None = None
    assignee_id: uuid.UUID | None = None
    tags: list[str] | None = None
    comment: str | None = None


@router.get("/sla/breaches")
async def breaches(db: DB, _=Depends(require("incident:read"))):
    q = select(Incident).where(Incident.sla_due_at < datetime.now(timezone.utc),
                               Incident.status.notin_(["cerrado", "falso_positivo"]))
    return [ser(i) for i in (await db.execute(q)).scalars()]


@router.get("")
async def list_inc(db: DB, status: str | None = None, severity: str | None = None, channel: str | None = None,
                   assignee_id: uuid.UUID | None = None, limit: int = 50, offset: int = 0,
                   _=Depends(require("incident:read"))):
    q = select(Incident).order_by(Incident.created_at.desc())
    for col, v in ((Incident.status, status), (Incident.severity, severity), (Incident.channel, channel),
                   (Incident.assignee_id, assignee_id)):
        if v:
            q = q.where(col == v)
    return [ser(i) for i in (await db.execute(q.limit(limit).offset(offset))).scalars()]


@router.post("", status_code=201)
async def create(body: IncIn, db: DB, request: Request, actor=Depends(require("incident:write"))):
    if body.severity not in SLA_H:
        raise HTTPException(422, "Severidad inválida")
    inc = Incident(title=body.title, description=body.description, severity=body.severity, channel=body.channel,
                   assignee_id=body.assignee_id, tags=body.tags,
                   sla_due_at=datetime.now(timezone.utc) + timedelta(hours=SLA_H[body.severity]))
    db.add(inc)
    await db.flush()
    if body.detection_ids:
        await db.execute(update(Detection).where(Detection.id.in_(body.detection_ids)).values(incident_id=inc.id))
    db.add(IncidentEvent(incident_id=inc.id, event_type="creado", actor_id=actor.id, payload={"source": "manual"}))
    await audit(db, actor, "incident.create", "incidents", inc.id, {"severity": body.severity}, request)
    await db.refresh(inc)
    return ser(inc)


@router.get("/{iid}")
async def get_inc(iid: uuid.UUID, db: DB, _=Depends(require("incident:read"))):
    i = await db.get(Incident, iid)
    if not i:
        raise HTTPException(404, "Incidente no encontrado")
    return ser(i)


@router.patch("/{iid}")
async def patch(iid: uuid.UUID, body: IncPatch, db: DB, request: Request, actor=Depends(require("incident:write"))):
    i = await db.get(Incident, iid)
    if not i:
        raise HTTPException(404, "Incidente no encontrado")
    changes = {}
    if body.status and body.status != i.status:
        if body.status not in TRANS.get(i.status, set()):
            raise HTTPException(400, f"Transición inválida: {i.status} → {body.status}")
        changes["status"] = body.status
        i.status = body.status
        i.closed_at = datetime.now(timezone.utc) if body.status in ("cerrado", "falso_positivo") else None
    for k in ("title", "description", "severity", "tags", "assignee_id"):
        v = getattr(body, k)
        if v is not None and getattr(i, k) != v:
            setattr(i, k, v)
            changes[k] = str(v) if k == "assignee_id" else v
    if changes or body.comment:
        db.add(IncidentEvent(incident_id=i.id, event_type="cambio_estado" if "status" in changes else "comentario",
                             actor_id=actor.id, payload={"changes": changes, "comment": body.comment}))
        await audit(db, actor, "incident.update", "incidents", i.id, changes, request)
    await db.flush()
    await db.refresh(i)
    return ser(i)


@router.get("/{iid}/events")
async def events(iid: uuid.UUID, db: DB, _=Depends(require("incident:read"))):
    q = select(IncidentEvent).where(IncidentEvent.incident_id == iid).order_by(IncidentEvent.created_at)
    return [ser(e) for e in (await db.execute(q)).scalars()]
