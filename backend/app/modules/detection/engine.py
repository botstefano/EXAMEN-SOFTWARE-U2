import asyncio
from datetime import datetime, timezone
from sqlalchemy import select, text
from app.core.config import get_settings
from app.core.utils import normalize
from app.models import Detection, Indicator, RuleEntry, RuleList
from app.modules.detection import heuristics as H
from app.modules.llm import generate


async def check_rules(db, value: str):
    now = datetime.now(timezone.utc)
    rows = (await db.execute(
        select(RuleList.kind, RuleList.name, RuleEntry.value)
        .join(RuleEntry, RuleEntry.list_id == RuleList.id)
        .where(RuleList.is_active, RuleEntry.value_normalized == normalize(value),
               (RuleEntry.expires_at.is_(None)) | (RuleEntry.expires_at > now)))).all()
    rows = sorted(rows, key=lambda r: 0 if r.kind == "whitelist" else 1)
    if rows:
        return {"matched": True, "kind": rows[0].kind, "list_name": rows[0].name, "entry_value": rows[0].value}
    return {"matched": False, "kind": None, "list_name": None, "entry_value": None}


async def _dns(host: str) -> dict:
    try:
        infos = await asyncio.wait_for(asyncio.get_running_loop().getaddrinfo(host, None), 4)
        return {"resolved": True, "a_records": sorted({i[4][0] for i in infos})}
    except Exception:
        return {"resolved": False, "a_records": []}


async def analyze(db, payload: dict) -> dict:
    s = get_settings()
    url, txt, html = payload.get("url"), payload.get("text"), payload.get("html")
    channel = payload.get("channel", "email")
    score, reasons, features, matched, whitelisted = 0.0, [], {}, [], False
    urls = [url] if url else []
    if txt:
        ts, tr, found = H.analyze_text(txt)
        score, reasons = max(score, ts), reasons + tr
        urls += found[:5]
    if html:
        hs, hr = H.analyze_html(html)
        score, reasons = max(score, hs), reasons + hr

    for u in urls:
        f = H.analyze_url(u)
        features.setdefault("urls", []).append(f)
        host, norm = f["host"], normalize(u)
        rule = await check_rules(db, host) if host else {"matched": False}
        if not rule["matched"]:
            rule = await check_rules(db, norm)
        if rule["matched"] and rule["kind"] == "whitelist":
            whitelisted = True
            reasons.append(f"{host} está en whitelist ({rule['list_name']})")
            continue
        us, ur = H.score_url(f)
        if rule["matched"]:
            us = max(us, 0.95)
            ur.append(f"coincide con blacklist «{rule['list_name']}»")
        ind = (await db.execute(select(Indicator).where(Indicator.value_normalized.in_([norm, host]),
                                                         Indicator.is_active))).scalars().first()
        if ind:
            us = max(us, 0.95)
            ur.append("IOC exacto en base de conocimiento")
            matched.append({"indicator_id": str(ind.id), "value": ind.value, "type": ind.type})
            ind.hit_count += 1
            ind.last_seen = datetime.now(timezone.utc)
        elif host:
            rows = (await db.execute(text(
                "SELECT id, value, type, similarity(value_normalized,:q) AS sim FROM indicators "
                "WHERE type IN ('dominio','url') AND value_normalized % :q ORDER BY sim DESC LIMIT 3"),
                {"q": host})).mappings().all()
            rows = [r for r in rows if r["sim"] >= 0.6]
            if rows:
                us += 0.15
                ur.append("similitud con IOC conocido")
                matched += [{"indicator_id": str(r["id"]), "value": r["value"], "type": r["type"]} for r in rows]
        if s.enable_network_checks and host and not f["has_ip_host"]:
            dns = await _dns(host)
            f["dns"] = dns
            if not dns["resolved"]:
                us += 0.10
                ur.append("el dominio no resuelve en DNS")
        score = max(score, min(us, 0.99))
        reasons += ur

    llm_res = None
    if txt and s.llm_provider != "none":
        out = await generate("Eres analista antifraude bancario. Responde en una frase si este mensaje es "
                             f"phishing y por qué:\n{txt[:3000]}")
        if out:
            llm_res = {"summary": out.strip()}
    if whitelisted and score < 0.5:
        score = 0.0
    score = round(min(score, 0.99), 3)
    verdict = "phishing" if score >= 0.7 else "sospechoso" if score >= 0.4 else "benigno"
    if not reasons and verdict == "benigno":
        reasons = ["no se detectaron señales de phishing"]
    d = Detection(verdict=verdict, confidence=score, channel=channel,
                  meta={"url": url, "reasons": reasons, "features": features, "matched": matched})
    db.add(d)
    await db.flush()
    return {"verdict": verdict, "confidence": score, "reasons": reasons, "matched_indicators": matched,
            "features": features, "llm": llm_res, "detection_id": str(d.id)}
