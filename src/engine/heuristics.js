export const BRANDS = ["paypal", "bbva", "santander", "caixabank", "bankinter", "visa", "mastercard", "banco"];

export const LEGIT = new Set([
  "paypal.com",
  "bbva.es",
  "bbva.com",
  "santander.es",
  "santander.com",
  "caixabank.es",
  "bankinter.com",
  "visa.com",
  "mastercard.com",
  "banco.example",
  "phishguard.bank",
]);

export const BAD_TLDS = new Set(["tk", "ml", "ga", "cf", "gq", "top", "work", "click", "zip"]);

export const SHORTENERS = new Set(["bit.ly", "t.co", "tinyurl.com", "goo.gl", "ow.ly", "cutt.ly"]);

export const URGENCY = [
  "urgente",
  "urgent",
  "inmediatamente",
  "immediately",
  "bloqueada",
  "suspendida",
  "verifique",
  "verify",
  "confirme",
  "confirm",
  "contraseña",
  "password",
  "otp",
  "acceso",
  "24 horas",
  "expira",
];

export function entropy(s) {
  if (!s || s.length === 0) return 0.0;
  const counts = {};
  for (const c of s) {
    counts[c] = (counts[c] || 0) + 1;
  }
  let ent = 0.0;
  const len = s.length;
  for (const c in counts) {
    const p = counts[c] / len;
    ent -= p * Math.log2(p);
  }
  return ent;
}

export function levenshtein(a, b) {
  const al = a.length;
  const bl = b.length;
  let prev = Array.from({ length: bl + 1 }, (_, i) => i);
  for (let i = 1; i <= al; i++) {
    const cur = [i];
    for (let j = 1; j <= bl; j++) {
      cur.push(
        Math.min(
          cur[j - 1] + 1,
          prev[j] + 1,
          prev[j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0)
        )
      );
    }
    prev = cur;
  }
  return prev[bl];
}

export function analyzeUrl(url) {
  const raw = url.includes("://") ? url : `http://${url}`;
  let host = "";
  let protocol = "http:";
  try {
    const parsed = new URL(raw);
    host = (parsed.hostname || "").toLowerCase();
    protocol = parsed.protocol;
  } catch {
    const match = raw.match(/^[a-z]+:\/\/([^/?#]+)/i);
    host = (match ? match[1] : raw.split("/")[0]).toLowerCase();
  }

  const labels = host.split(".").filter(Boolean);
  const registered = labels.length >= 2 ? labels.slice(-2).join(".") : host;
  const main = labels.length >= 2 ? labels[labels.length - 2] : host;

  let brandHit = null;
  let brandDist = 99;

  if (!LEGIT.has(registered)) {
    const deleet = main.replace(/1/g, "l").replace(/0/g, "o").replace(/3/g, "e");
    const parts = deleet.split(/[-_]/).filter(Boolean).concat([deleet]);
    for (const b of BRANDS) {
      if (deleet.includes(b) || host.includes(b)) {
        brandHit = b;
        brandDist = 0;
        break;
      }
      const minDist = Math.min(...parts.map((x) => levenshtein(x, b)));
      if (minDist <= 1 && minDist < brandDist) {
        brandHit = b;
        brandDist = minDist;
      }
    }
  }

  const hasIpHref = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  const tld = labels.length > 0 ? labels[labels.length - 1] : "";

  return {
    host,
    length: raw.length,
    host_entropy: Number(entropy(host).toFixed(3)),
    has_at_symbol: raw.includes("@"),
    has_ip_host: hasIpHref,
    has_punycode: host.includes("xn--"),
    num_subdomains: Math.max(labels.length - 2, 0),
    has_shortener: SHORTENERS.has(host),
    suspicious_tld: BAD_TLDS.has(tld),
    has_https: protocol === "https:",
    brand_impersonated: brandHit,
    brand_distance: brandDist,
    legit_domain: LEGIT.has(registered),
  };
}

export function scoreUrl(f) {
  let s = 0.0;
  const r = [];

  const add = (v, msg) => {
    s += v;
    r.push(msg);
  };

  if (f.legit_domain) {
    return [0.0, []];
  }
  if (f.has_ip_host) add(0.25, "el host es una IP");
  if (f.has_at_symbol) add(0.20, "la URL contiene '@'");
  if (f.has_punycode) add(0.20, "dominio punycode (posible homograph)");
  if (f.host_entropy > 3.8) add(0.10, `alta entropía en host (${f.host_entropy})`);
  if (f.num_subdomains >= 3) add(0.10, "exceso de subdominios");
  if (f.has_shortener) add(0.10, "acortador de URL");
  if (f.suspicious_tld) add(0.15, "TLD sospechoso");
  if (f.brand_impersonated) add(0.40, `posible suplantación de marca (${f.brand_impersonated})`);
  if (!f.has_https) add(0.05, "sin HTTPS");

  return [Math.min(s, 0.95), r];
}

export function analyzeText(text) {
  const low = (text || "").toLowerCase();
  const hits = URGENCY.filter((w) => low.includes(w));
  const urlMatches = (text || "").match(/https?:\/\/[^\s"'<>)]+/g) || [];
  let score = 0.0;
  const reasons = [];
  if (hits.length >= 2) {
    score += Math.min(0.15 * hits.length, 0.45);
    reasons.push(`lenguaje de urgencia/credenciales (${hits.slice(0, 4).join(", ")})`);
  }
  return [score, reasons, urlMatches];
}

export function analyzeHtml(html) {
  const low = (html || "").toLowerCase().replace(/'/g, '"');
  let s = 0.0;
  const r = [];
  if (low.includes("<form") && low.includes('type="password"')) {
    s += 0.30;
    r.push("formulario con campo de contraseña");
  }
  if (/action="https?:\/\//.test(low)) {
    s += 0.10;
    r.push("formulario envía datos a dominio externo");
  }
  return [s, r];
}
