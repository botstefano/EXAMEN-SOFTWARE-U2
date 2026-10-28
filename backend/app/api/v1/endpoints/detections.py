import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.utils import ser
from app.deps import DB, require
from app.models import Detection
from app.modules.detection.engine import analyze

router = APIRouter()


class ScanIn(BaseModel):
    url: str | None = None
    text: str | None = None
    html: str | None = None
    channel: str = "email"


@router.post("/scan")
async def scan(body: ScanIn, db: DB, _=Depends(require("detection:write"))):
    if not (body.url or body.text or body.html):
        raise HTTPException(422, "Se requiere url, text o html")
    return await analyze(db, body.model_dump())


@router.get("/{did}")
async def get_det(did: uuid.UUID, db: DB, _=Depends(require("detection:read"))):
    d = await db.get(Detection, did)
    if not d:
        raise HTTPException(404, "Detección no encontrada")
    return ser(d)
