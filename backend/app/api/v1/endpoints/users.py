import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import delete, select
from app.core.security import hash_password
from app.core.utils import ser
from app.deps import DB, audit, require, user_roles
from app.models import Permission, Role, RolePermission, User, UserRole

users_router = APIRouter()
roles_router = APIRouter()


async def _out(db, u):
    d = ser(u, exclude=("password_hash", "mfa_secret"))
    d["roles"] = await user_roles(db, u.id)
    return d


async def _set_roles(db, uid, codes):
    await db.execute(delete(UserRole).where(UserRole.user_id == uid))
    for r in (await db.execute(select(Role).where(Role.code.in_(codes)))).scalars():
        db.add(UserRole(user_id=uid, role_id=r.id))


class UserIn(BaseModel):
    email: str
    full_name: str
    password: str
    role_codes: list[str] = []


class UserPatch(BaseModel):
    full_name: str | None = None
    is_active: bool | None = None
    role_codes: list[str] | None = None


@users_router.get("")
async def list_users(db: DB, limit: int = 100, offset: int = 0, _=Depends(require("user:manage"))):
    us = (await db.execute(select(User).order_by(User.created_at.desc()).limit(limit).offset(offset))).scalars().all()
    return [await _out(db, u) for u in us]


@users_router.post("", status_code=201)
async def create_user(body: UserIn, db: DB, request: Request, actor=Depends(require("user:manage"))):
    email = body.email.strip().lower()
    if len(body.password) < 12:
        raise HTTPException(422, "La contraseña debe tener al menos 12 caracteres")
    if (await db.execute(select(User).where(User.email == email))).scalar_one_or_none():
        raise HTTPException(409, "Email ya registrado")
    u = User(email=email, full_name=body.full_name, password_hash=hash_password(body.password))
    db.add(u)
    await db.flush()
    await _set_roles(db, u.id, body.role_codes)
    await audit(db, actor, "user.create", "users", u.id, {"roles": body.role_codes}, request)
    return await _out(db, u)


@users_router.patch("/{uid}")
async def patch_user(uid: uuid.UUID, body: UserPatch, db: DB, request: Request, actor=Depends(require("user:manage"))):
    u = await db.get(User, uid)
    if not u:
        raise HTTPException(404, "Usuario no encontrado")
    if body.full_name is not None: u.full_name = body.full_name
    if body.is_active is not None: u.is_active = body.is_active
    if body.role_codes is not None: await _set_roles(db, u.id, body.role_codes)
    await audit(db, actor, "user.update", "users", u.id, body.model_dump(exclude_none=True), request)
    await db.flush()
    return await _out(db, u)


@roles_router.get("")
async def list_roles(db: DB, _=Depends(require("role:manage"))):
    out = []
    for r in (await db.execute(select(Role).order_by(Role.id))).scalars():
        perms = (await db.execute(select(Permission.code).join(RolePermission, RolePermission.permission_id == Permission.id)
                                  .where(RolePermission.role_id == r.id))).scalars().all()
        out.append({"id": r.id, "code": r.code, "name": r.name, "description": r.description, "permissions": sorted(perms)})
    return out
