from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from app.deps import DB, require

router = APIRouter()


@router.get("/kpis")
async def kpis(db: DB, _=Depends(require("dashboard:read"))):
    r = (await db.execute(text(
        "SELECT count(*) FILTER (WHERE verdict='phishing') p, count(*) FILTER (WHERE verdict='sospechoso') s, "
        "count(*) FILTER (WHERE verdict='benigno') b FROM detections WHERE detected_at >= now() - interval '30 days'"))).one()
    mttr = (await db.execute(text(
        "SELECT COALESCE(avg(extract(epoch from (closed_at-created_at))/60),0) FROM incidents "
        "WHERE closed_at IS NOT NULL AND status='cerrado'"))).scalar_one()
    fp = (await db.execute(text(
        "SELECT count(*) FILTER (WHERE status='falso_positivo')::float / NULLIF(count(*) FILTER (WHERE status IN ('cerrado','falso_positivo')),0) "
        "FROM incidents"))).scalar_one()
    br = (await db.execute(text(
        "SELECT count(*) FROM incidents WHERE sla_due_at < now() AND status NOT IN ('cerrado','falso_positivo')"))).scalar_one()
    return {"phishing_total": r.p, "suspicious_total": r.s, "benign_total": r.b, "fp_rate": round(float(fp or 0), 4),
            "mttr_minutes": round(float(mttr), 1), "sla_breaches": br}


@router.get("/trends")
async def trends(db: DB, days: int = Query(30, ge=7, le=365), _=Depends(require("dashboard:read"))):
    rows = (await db.execute(text(
        "SELECT date_trunc('day',detected_at)::date d, count(*) FILTER (WHERE verdict='phishing') p, "
        "count(*) FILTER (WHERE verdict='benigno') b FROM detections "
        "WHERE detected_at >= now() - make_interval(days => :d) GROUP BY 1 ORDER BY 1"), {"d": days})).all()
    return [{"day": r.d.isoformat(), "phishing": r.p, "benign": r.b} for r in rows]


@router.get("/channels")
async def channels(db: DB, _=Depends(require("dashboard:read"))):
    rows = (await db.execute(text(
        "SELECT channel, count(*) t FROM detections WHERE detected_at >= now() - interval '30 days' "
        "GROUP BY 1 ORDER BY t DESC"))).all()
    return [{"channel": r.channel, "total": r.t} for r in rows]


@router.get("/top-attackers")
async def top(db: DB, limit: int = Query(10, ge=1, le=100), _=Depends(require("dashboard:read"))):
    rows = (await db.execute(text(
        "SELECT value_normalized d, hit_count h FROM indicators WHERE type IN ('dominio','url') AND is_active "
        "ORDER BY hit_count DESC, last_seen DESC LIMIT :l"), {"l": limit})).all()
    return [{"domain": r.d, "hits": r.h} for r in rows]
