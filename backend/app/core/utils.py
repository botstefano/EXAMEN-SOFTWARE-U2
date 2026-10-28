import re, unicodedata, uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import inspect


def normalize(value: str) -> str:
    v = unicodedata.normalize("NFKC", value.strip().lower())
    v = re.sub(r"^https?://", "", v)
    return v.rstrip("/")


def ser(o, exclude=()):
    d = {}
    for a in inspect(o).mapper.column_attrs:
        if a.key in exclude:
            continue
        v = getattr(o, a.key)
        if isinstance(v, uuid.UUID):
            v = str(v)
        elif isinstance(v, datetime):
            v = v.isoformat()
        elif isinstance(v, Decimal):
            v = float(v)
        d["metadata" if a.key == "meta" else a.key] = v
    return d
