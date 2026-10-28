import math, re
from urllib.parse import urlparse

BRANDS = ["paypal", "bbva", "santander", "caixabank", "bankinter", "visa", "mastercard", "banco"]
LEGIT = {"paypal.com", "bbva.es", "bbva.com", "santander.es", "santander.com", "caixabank.es",
         "bankinter.com", "visa.com", "mastercard.com", "banco.example", "phishguard.bank"}
BAD_TLDS = {"tk", "ml", "ga", "cf", "gq", "top", "work", "click", "zip"}
SHORTENERS = {"bit.ly", "t.co", "tinyurl.com", "goo.gl", "ow.ly", "cutt.ly"}
URGENCY = ["urgente", "urgent", "inmediatamente", "immediately", "bloqueada", "suspendida", "verifique",
           "verify", "confirme", "confirm", "contraseña", "password", "otp", "acceso", "24 horas", "expira"]


def entropy(s: str) -> float:
    if not s:
        return 0.0
    return -sum((s.count(c) / len(s)) * math.log2(s.count(c) / len(s)) for c in set(s))


def levenshtein(a: str, b: str) -> int:
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def analyze_url(url: str) -> dict:
    raw = url if "://" in url else f"http://{url}"
    p = urlparse(raw)
    host = (p.hostname or "").lower()
    labels = host.split(".")
    registered = ".".join(labels[-2:]) if len(labels) >= 2 else host
    main = labels[-2] if len(labels) >= 2 else host
    brand_hit, brand_dist = None, 99
    if registered not in LEGIT:
        deleet = main.replace("1", "l").replace("0", "o").replace("3", "e")
        parts = [x for x in re.split(r"[-_]", deleet) if x] + [deleet]
        for b in BRANDS:
            if b in deleet or b in host:
                brand_hit, brand_dist = b, 0
                break
            d = min(levenshtein(x, b) for x in parts)
            if d <= 1 and d < brand_dist:
                brand_hit, brand_dist = b, d
    return {
        "host": host, "length": len(raw), "host_entropy": round(entropy(host), 3),
        "has_at_symbol": "@" in raw, "has_ip_host": bool(re.fullmatch(r"\d{1,3}(\.\d{1,3}){3}", host)),
        "has_punycode": "xn--" in host, "num_subdomains": max(len(labels) - 2, 0),
        "has_shortener": host in SHORTENERS, "suspicious_tld": labels[-1] in BAD_TLDS,
        "has_https": p.scheme == "https", "brand_impersonated": brand_hit, "brand_distance": brand_dist,
        "legit_domain": registered in LEGIT,
    }


def score_url(f: dict) -> tuple[float, list[str]]:
    s, r = 0.0, []

    def add(v, msg):
        nonlocal s
        s += v
        r.append(msg)

    if f["legit_domain"]:
        return 0.0, []
    if f["has_ip_host"]: add(0.25, "el host es una IP")
    if f["has_at_symbol"]: add(0.20, "la URL contiene '@'")
    if f["has_punycode"]: add(0.20, "dominio punycode (posible homograph)")
    if f["host_entropy"] > 3.8: add(0.10, f"alta entropía en host ({f['host_entropy']})")
    if f["num_subdomains"] >= 3: add(0.10, "exceso de subdominios")
    if f["has_shortener"]: add(0.10, "acortador de URL")
    if f["suspicious_tld"]: add(0.15, "TLD sospechoso")
    if f["brand_impersonated"]: add(0.40, f"posible suplantación de marca ({f['brand_impersonated']})")
    if not f["has_https"]: add(0.05, "sin HTTPS")
    return min(s, 0.95), r


def analyze_text(text: str) -> tuple[float, list[str], list[str]]:
    low = text.lower()
    hits = [w for w in URGENCY if w in low]
    urls = re.findall(r"https?://[^\s\"'<>)]+", text)
    score, reasons = 0.0, []
    if len(hits) >= 2:
        score += min(0.15 * len(hits), 0.45)
        reasons.append(f"lenguaje de urgencia/credenciales ({', '.join(hits[:4])})")
    return score, reasons, urls


def analyze_html(html: str) -> tuple[float, list[str]]:
    low = html.lower().replace("'", '"')
    s, r = 0.0, []
    if "<form" in low and 'type="password"' in low:
        s += 0.30
        r.append("formulario con campo de contraseña")
    if re.search(r'action="https?://', low):
        s += 0.10
        r.append("formulario envía datos a dominio externo")
    return s, r
