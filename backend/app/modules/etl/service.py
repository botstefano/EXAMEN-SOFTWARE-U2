import csv, hashlib, io
import httpx
from sqlalchemy.dialects.postgresql import insert
from app.core.config import get_settings
from app.core.utils import normalize
from app.models import DatasetVersion, Indicator, RawSample

SAMPLE = ["http://paypa1-secure-login.example/verify", "http://bbva-seguro-online.example/activa",
          "http://santander-seguro.example/login", "http://banco-acceso-clientes.example/otp",
          "http://caixabank-verifica.example/cuenta"]


async def _fetch(source: str):
    s = get_settings()
    if source == "sample":
        return "\n".join(SAMPLE).encode(), "Muestra interna de demostración", "builtin://sample", SAMPLE
    url = s.phishtank_url if source == "phishtank" else s.openphish_url
    async with httpx.AsyncClient(timeout=120, follow_redirects=True, headers={"User-Agent": "phishguard/1.0"}) as c:
        r = await c.get(url)
        r.raise_for_status()
    raw = r.content
    if source == "phishtank":
        urls = [row.get("url", "") for row in csv.DictReader(io.StringIO(raw.decode("utf-8", "ignore")))]
        lic = "PhishTank Terms of Use"
    else:
        urls = [l.strip() for l in raw.decode("utf-8", "ignore").splitlines()]
        lic = "OpenPhish Free Feed"
    return raw, lic, url, [u for u in urls if u]


async def run(db, source: str) -> dict:
    if source not in ("sample", "phishtank", "openphish"):
        raise ValueError(f"Fuente desconocida: {source}")
    raw, lic, url, urls = await _fetch(source)
    v = DatasetVersion(source_name=source, license=lic, checksum_sha256=hashlib.sha256(raw).hexdigest(),
                       row_count=len(urls), source_url=url)
    db.add(v)
    await db.flush()
    urls = urls[:5000]
    for u in urls:
        db.add(RawSample(version_id=v.id, payload={"url": u}, label="phishing"))
    rows, seen = [], set()
    for u in urls:
        n = normalize(u)
        if n in seen:
            continue
        seen.add(n)
        rows.append({"type": "url", "value": u, "value_normalized": n, "attrs": {"source": source}})
    inserted = 0
    for i in range(0, len(rows), 500):
        res = await db.execute(insert(Indicator).values(rows[i:i + 500])
                               .on_conflict_do_nothing(index_elements=["type", "value_normalized"]))
        inserted += res.rowcount or 0
    return {"source": source, "version_id": str(v.id), "rows": len(urls), "inserted": inserted,
            "checksum": v.checksum_sha256}
