import uuid
from typing import Annotated
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import decode
from app.db import get_db
from app.models import AuditLog, Permission, Role, RolePermission, User, UserRole

DB = Annotated[AsyncSession, Depends(get_db)]
bearer = HTTPBearer(auto_error=False)


async def get_current_user(db: DB, creds: HTTPAuthorizationCredentials | None = Depends(bearer)) -> User:
    if not creds:
        raise HTTPException(401, "No autenticado")
    try:
        p = decode(creds.credentials)
        if p.get("type") != "access":
            raise ValueError
        user = await db.get(User, uuid.UUID(p["sub"]))
    except Exception:
        raise HTTPException(401, "Token inválido o expirado")
    if not user or not user.is_active:
        raise HTTPException(401, "Usuario inactivo")
    return user


async def user_roles(db, uid) -> list[str]:
    r = await db.execute(select(Role.code).join(UserRole, UserRole.role_id == Role.id).where(UserRole.user_id == uid))
    return list(r.scalars().all())


async def user_perms(db, uid) -> list[str]:
    r = await db.execute(
        select(Permission.code).join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(UserRole, UserRole.role_id == RolePermission.role_id).where(UserRole.user_id == uid))
    return sorted(set(r.scalars().all()))


def require(*codes: str):
    async def checker(db: DB, user: User = Depends(get_current_user)) -> User:
        if "admin" in await user_roles(db, user.id):
            return user
        perms = await user_perms(db, user.id)
        if not any(c in perms for c in codes):
            raise HTTPException(403, f"Permiso requerido: {' | '.join(codes)}")
        return user
    return checker


async def audit(db, actor, action, resource, resource_id=None, payload=None, request: Request | None = None):
    db.add(AuditLog(actor_id=actor.id if actor else None, actor_email=actor.email if actor else None,
                    action=action, resource=resource, resource_id=str(resource_id) if resource_id else None,
                    ip_address=request.client.host if request and request.client else None, payload=payload or {}))
