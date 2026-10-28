from datetime import datetime, timedelta, timezone
import bcrypt, jwt
from app.core.config import get_settings

s = get_settings()


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt(12)).decode()


def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False


def _token(sub: str, kind: str, delta: timedelta, extra=None) -> str:
    payload = {"sub": sub, "type": kind, "exp": datetime.now(timezone.utc) + delta, **(extra or {})}
    return jwt.encode(payload, s.secret_key, algorithm="HS256")


def create_access(sub: str, extra=None):
    return _token(sub, "access", timedelta(minutes=s.access_token_expire_minutes), extra)


def create_refresh(sub: str):
    return _token(sub, "refresh", timedelta(days=s.refresh_token_expire_days))


def decode(token: str) -> dict:
    return jwt.decode(token, s.secret_key, algorithms=["HS256"])
