import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import func, select
from app.core.utils import normalize, ser
from app.deps import DB, audit, require
from app.models import RuleEntry, RuleList
from app.modules.detection.engine import check_rules

router = APIRouter()


class ListIn(BaseModel):
    name: str
    kind: str


class EntryIn(BaseModel):
    value: str
    reason: str | None = None
    expires_at: datetime | None = None


class CheckIn(BaseModel):
    value: str


@router.get("")
async def lists(db: DB, _=Depends(require("indicator:read"))):
    out = []
    for rl in (await db.execute(select(RuleList).order_by(RuleList.name))).scalars():
        n = (await db.execute(select(func.count()).select_from(RuleEntry).where(RuleEntry.list_id == rl.id))).scalar_one()
        out.append({**ser(rl), "entries_count": n})
    return out


@router.post("", status_code=201)
async def create(body: ListIn, db: DB, request: Request, actor=Depends(require("indicator:write"))):
    if body.kind not in ("blacklist", "whitelist"):
        raise HTTPException(422, "kind debe ser blacklist o whitelist")
    if (await db.execute(select(RuleList).where(RuleList.name == body.name))).scalar_one_or_none():
        raise HTTPException(409, "Ya existe una lista con ese nombre")
    rl = RuleList(name=body.name, kind=body.kind)
    db.add(rl)
    await db.flush()
    await db.refresh(rl)
    await audit(db, actor, "rule_list.create", "rule_lists", rl.id, request=request)
    return {**ser(rl), "entries_count": 0}


@router.delete("/entries/{eid}", status_code=204)
async def del_entry(eid: int, db: DB, request: Request, actor=Depends(require("indicator:write"))):
    e = await db.get(RuleEntry, eid)
    if e:
        await db.delete(e)
        await audit(db, actor, "rule_entry.delete", "rule_entries", eid, request=request)


@router.post("/check")
async def check(body: CheckIn, db: DB, _=Depends(require("indicator:read"))):
    return await check_rules(db, body.value)


@router.get("/{lid}/entries")
async def entries(lid: uuid.UUID, db: DB, _=Depends(require("indicator:read"))):
    q = select(RuleEntry).where(RuleEntry.list_id == lid).order_by(RuleEntry.id.desc())
    return [ser(e, exclude=("value_normalized", "list_id")) for e in (await db.execute(q)).scalars()]


@router.post("/{lid}/entries", status_code=201)
async def add_entry(lid: uuid.UUID, body: EntryIn, db: DB, request: Request, actor=Depends(require("indicator:write"))):
    if not await db.get(RuleList, lid):
        raise HTTPException(404, "Lista no encontrada")
    n = normalize(body.value)
    e = (await db.execute(select(RuleEntry).where(RuleEntry.list_id == lid, RuleEntry.value_normalized == n))).scalar_one_or_none()
    if not e:
        e = RuleEntry(list_id=lid, value=body.value, value_normalized=n, reason=body.reason, expires_at=body.expires_at)
        db.add(e)
        await db.flush()
        await audit(db, actor, "rule_entry.create", "rule_entries", e.id, {"value": n}, request)
    return ser(e, exclude=("value_normalized", "list_id"))
