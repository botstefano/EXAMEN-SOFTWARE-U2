import uuid
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import select, text
from app.core.config import get_settings
from app.core.utils import normalize, ser
from app.deps import DB, audit, require
from app.models import IOCEnrichment, Indicator

router = APIRouter()
ti_router = APIRouter()
TYPES = {"url", "dominio", "ip", "hash", "email", "telefono"}


class IndIn(BaseModel):
    type: str
    value: str
    attrs: dict = {}
    source: str = "manual"


@router.get("/active")
async def active(db: DB, limit: int = 100, _=Depends(require("indicator:read"))):
    q = select(Indicator).where(Indicator.is_active).order_by(Indicator.last_seen.desc()).limit(limit)
    return [ser(i) for i in (await db.execute(q)).scalars()]


@router.get("")
async def search(db: DB, q: str = Query(min_length=3), threshold: float = 0.3, _=Depends(require("indicator:read"))):
    rows = (await db.execute(text(
        "SELECT id, type, value, is_active, similarity(value_normalized,:q) AS sim FROM indicators "
        "WHERE value_normalized % :q OR value_normalized ILIKE :like ORDER BY sim DESC LIMIT 50"),
        {"q": normalize(q), "like": f"%{normalize(q)}%"})).mappings().all()
    return [{"id": str(r["id"]), "type": r["type"], "value": r["value"], "similarity": float(r["sim"]),
             "is_active": r["is_active"]} for r in rows if r["sim"] >= threshold or normalize(q) in r["value"].lower()]


@router.post("", status_code=201)
async def create(body: IndIn, db: DB, request: Request, actor=Depends(require("indicator:write"))):
    if body.type not in TYPES:
        raise HTTPException(422, "Tipo de IOC inválido")
    n = normalize(body.value)
    ind = (await db.execute(select(Indicator).where(Indicator.type == body.type, Indicator.value_normalized == n))).scalar_one_or_none()
    if ind:
        ind.hit_count += 1
        ind.attrs = {**(ind.attrs or {}), **body.attrs}
    else:
        ind = Indicator(type=body.type, value=body.value, value_normalized=n, attrs={**body.attrs, "source": body.source})
        db.add(ind)
    await db.flush()
    await db.refresh(ind)
    await audit(db, actor, "indicator.upsert", "indicators", ind.id, request=request)
    return ser(ind)


@ti_router.post("/indicators/{iid}/enrich")
async def enrich(iid: uuid.UUID, db: DB, _=Depends(require("indicator:write"))):
    ind = await db.get(Indicator, iid)
    if not ind:
        raise HTTPException(404, "Indicador no encontrado")
    providers = [{"provider": "local", "hit_count": ind.hit_count, "first_seen": ind.first_seen.isoformat(),
                  "last_seen": ind.last_seen.isoformat(), "attrs": ind.attrs}]
    key = get_settings().virustotal_api_key
    if not key:
        providers.append({"provider": "virustotal", "skipped": "VIRUSTOTAL_API_KEY no configurada"})
    elif ind.type in ("dominio", "ip"):
        path = "domains" if ind.type == "dominio" else "ip_addresses"
        try:
            async with httpx.AsyncClient(timeout=15) as c:
                r = await c.get(f"https://www.virustotal.com/api/v3/{path}/{ind.value_normalized}", headers={"x-apikey": key})
            if r.status_code == 200:
                st = r.json()["data"]["attributes"].get("last_analysis_stats", {})
                score = round(st.get("malicious", 0) / (sum(st.values()) or 1) * 100, 2)
                db.add(IOCEnrichment(indicator_id=ind.id, provider="virustotal", score=score, data=st))
                providers.append({"provider": "virustotal", "score": score, "stats": st})
            else:
                providers.append({"provider": "virustotal", "found": False, "status": r.status_code})
        except Exception as e:
            providers.append({"provider": "virustotal", "error": str(e)})
    return {"indicator": ind.value, "type": ind.type, "providers": providers}
