import uuid
from datetime import datetime, timedelta, timezone
import pyotp
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from sqlalchemy import select
from app.core.config import get_settings
from app.core.security import create_access, create_refresh, decode, hash_password, verify_password
from app.deps import DB, audit, get_current_user, user_perms, user_roles
from app.models import User

router = APIRouter()


class LoginIn(BaseModel):
    email: str
    password: str
    mfa_code: str | None = None


class RefreshIn(BaseModel):
    refresh_token: str


def tokens(u: User):
    return {"access_token": create_access(str(u.id), {"email": u.email}), "refresh_token": create_refresh(str(u.id)),
            "token_type": "bearer", "expires_in": get_settings().access_token_expire_minutes * 60}


@router.post("/login")
async def login(body: LoginIn, db: DB, request: Request):
    u = (await db.execute(select(User).where(User.email == body.email.strip().lower()))).scalar_one_or_none()
    if not u or not u.is_active:
        raise HTTPException(401, "Credenciales inválidas")
    now = datetime.now(timezone.utc)
    if u.locked_until and u.locked_until > now:
        raise HTTPException(401, "Cuenta bloqueada temporalmente")
    if not verify_password(body.password, u.password_hash):
        u.failed_attempts += 1
        if u.failed_attempts >= 5:
            u.locked_until = now + timedelta(minutes=15)
        await db.commit()
        raise HTTPException(401, "Credenciales inválidas")
    if u.mfa_enabled:
        if not body.mfa_code:
            raise HTTPException(401, "MFA requerido")
        if not pyotp.TOTP(u.mfa_secret or "").verify(body.mfa_code, valid_window=1):
            raise HTTPException(401, "Código MFA inválido")
    u.failed_attempts, u.locked_until, u.last_login_at = 0, None, now
    await audit(db, u, "auth.login", "users", u.id, request=request)
    return tokens(u)


@router.post("/refresh")
async def refresh(body: RefreshIn, db: DB):
    try:
        p = decode(body.refresh_token)
        if p.get("type") != "refresh":
            raise ValueError
        u = await db.get(User, uuid.UUID(p["sub"]))
    except Exception:
        raise HTTPException(401, "Refresh token inválido")
    if not u or not u.is_active:
        raise HTTPException(401, "Usuario inválido")
    return tokens(u)


@router.post("/logout", status_code=204)
async def logout():
    return Response(status_code=204)


@router.get("/me")
async def me(db: DB, u: User = Depends(get_current_user)):
    return {"id": str(u.id), "email": u.email, "full_name": u.full_name, "mfa_enabled": u.mfa_enabled,
            "roles": await user_roles(db, u.id), "permissions": await user_perms(db, u.id)}


class PwdIn(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password", status_code=204)
async def change_password(body: PwdIn, db: DB, u: User = Depends(get_current_user)):
    if not verify_password(body.current_password, u.password_hash):
        raise HTTPException(400, "Contraseña actual incorrecta")
    if len(body.new_password) < 12 or body.new_password == body.current_password:
        raise HTTPException(400, "La nueva contraseña debe tener 12+ caracteres y ser distinta")
    u.password_hash = hash_password(body.new_password)
    await audit(db, u, "auth.change_password", "users", u.id)
    return Response(status_code=204)


@router.post("/mfa/setup")
async def mfa_setup(db: DB, u: User = Depends(get_current_user)):
    secret = pyotp.random_base32()
    u.mfa_secret = secret
    return {"secret": secret, "otp_uri": pyotp.TOTP(secret).provisioning_uri(u.email, issuer_name="PhishGuard Bank")}


class CodeIn(BaseModel):
    code: str


@router.post("/mfa/verify", status_code=204)
async def mfa_verify(body: CodeIn, db: DB, u: User = Depends(get_current_user)):
    if not u.mfa_secret or not pyotp.TOTP(u.mfa_secret).verify(body.code, valid_window=1):
        raise HTTPException(400, "Código inválido")
    u.mfa_enabled = True
    return Response(status_code=204)
