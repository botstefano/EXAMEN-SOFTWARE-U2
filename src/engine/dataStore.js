import { analyzeHtml, analyzeText, analyzeUrl, scoreUrl, levenshtein } from "./heuristics";

const STORAGE_KEY = "phishguard_data_v1";

const PERMS = [
  "detection:read", "detection:write", "incident:read", "incident:write", "incident:assign",
  "indicator:read", "indicator:write", "etl:execute", "etl:read", "report:generate", "report:read",
  "user:manage", "role:manage", "audit:read", "soc:assistant", "dashboard:read"
];

const ROLES_DEF = [
  { id: 1, code: "admin", name: "Administrador", description: "Rol Administrador", permissions: PERMS },
  {
    id: 2,
    code: "analista_soc",
    name: "Analista SOC",
    description: "Rol Analista SOC",
    permissions: ["detection:read", "detection:write", "incident:read", "incident:write", "incident:assign", "indicator:read", "indicator:write", "etl:read", "report:read", "soc:assistant", "dashboard:read"]
  },
  {
    id: 3,
    code: "auditor",
    name: "Auditor",
    description: "Rol Auditor",
    permissions: ["detection:read", "incident:read", "report:read", "audit:read", "dashboard:read"]
  },
  {
    id: 4,
    code: "reportes",
    name: "Gestor de reportes",
    description: "Rol Gestor de reportes",
    permissions: ["detection:read", "incident:read", "report:generate", "report:read", "dashboard:read"]
  },
  {
    id: 5,
    code: "readonly",
    name: "Solo lectura",
    description: "Rol Solo lectura",
    permissions: ["detection:read", "incident:read", "indicator:read", "dashboard:read"]
  }
];

function normalize(v) {
  if (!v) return "";
  let s = v.toLowerCase().trim();
  s = s.replace(/^https?:\/\//, "");
  s = s.replace(/^www\./, "");
  s = s.split("/")[0].split("?")[0].split("#")[0];
  return s;
}

function getInitialData() {
  const now = new Date();
  const subDays = (d, h = 0) => new Date(now.getTime() - d * 86400000 - h * 3600000).toISOString();
  const addHours = (base, h) => new Date(new Date(base).getTime() + h * 3600000).toISOString();

  const users = [
    {
      id: "u-1",
      email: "admin@phishguard.bank",
      full_name: "Elena Navarro (Admin)",
      password: "DemoPassw0rd!2026",
      roles: ["admin"],
      mfa_enabled: false,
      mfa_secret: null,
      failed_attempts: 0,
      locked_until: null,
      is_active: true,
      created_at: subDays(60)
    },
    {
      id: "u-2",
      email: "maria.lopez@phishguard.bank",
      full_name: "María López",
      password: "DemoPassw0rd!2026",
      roles: ["analista_soc"],
      mfa_enabled: false,
      mfa_secret: null,
      failed_attempts: 0,
      locked_until: null,
      is_active: true,
      created_at: subDays(60)
    },
    {
      id: "u-3",
      email: "carlos.ruiz@phishguard.bank",
      full_name: "Carlos Ruiz",
      password: "DemoPassw0rd!2026",
      roles: ["analista_soc"],
      mfa_enabled: false,
      mfa_secret: null,
      failed_attempts: 0,
      locked_until: null,
      is_active: true,
      created_at: subDays(60)
    },
    {
      id: "u-4",
      email: "ana.torres@phishguard.bank",
      full_name: "Ana Torres",
      password: "DemoPassw0rd!2026",
      roles: ["auditor"],
      mfa_enabled: false,
      mfa_secret: null,
      failed_attempts: 0,
      locked_until: null,
      is_active: true,
      created_at: subDays(60)
    },
    {
      id: "u-5",
      email: "javier.mendez@phishguard.bank",
      full_name: "Javier Méndez",
      password: "DemoPassw0rd!2026",
      roles: ["reportes"],
      mfa_enabled: false,
      mfa_secret: null,
      failed_attempts: 0,
      locked_until: null,
      is_active: true,
      created_at: subDays(60)
    },
    {
      id: "u-6",
      email: "audit.viewer@phishguard.bank",
      full_name: "Consulta Externa",
      password: "DemoPassw0rd!2026",
      roles: ["readonly"],
      mfa_enabled: false,
      mfa_secret: null,
      failed_attempts: 0,
      locked_until: null,
      is_active: true,
      created_at: subDays(60)
    }
  ];

  const SLA_H = { critica: 0.5, alta: 2, media: 8, baja: 24 };

  const incidentsRaw = [
    { id: "inc-1", title: "Campaña de phishing PayPal clonado", status: "investigacion", severity: "critica", channel: "email", days: 12, asg: "u-2", tags: ["paypal", "credential_harvesting"], summ: "28 correos con enlace a dominio typosquat." },
    { id: "inc-2", title: "Smishing BBVA con enlace fraudulento", status: "triage", severity: "alta", channel: "sms", days: 9, asg: "u-3", tags: ["bbva", "smishing"], summ: "12 SMS reportados por empleados." },
    { id: "inc-3", title: "QR falso en sucursal Madrid", status: "contencion", severity: "alta", channel: "qr", days: 8, asg: "u-2", tags: ["qr", "quishing"], summ: "QR redirige a formulario de credenciales." },
    { id: "inc-4", title: "Dominio typosquat santander-seguro.example", status: "cerrado", severity: "media", channel: "web", days: 25, asg: "u-3", tags: ["santander", "typosquat"], summ: "Takedown exitoso en 36 horas." },
    { id: "inc-5", title: "Correo suplantando RRHH (nóminas)", status: "falso_positivo", severity: "media", channel: "email", days: 20, asg: "u-2", tags: ["rrhh"], summ: "Comunicación interna legítima." },
    { id: "inc-6", title: "Llamadas de vishing suplantando al banco", status: "nuevo", severity: "alta", channel: "vishing", days: 1, asg: null, tags: ["vishing", "otp"], summ: "" },
    { id: "inc-7", title: "Clon de login BBVA (credential harvesting)", status: "cerrado", severity: "critica", channel: "web", days: 40, asg: "u-3", tags: ["bbva", "clon_visual"], summ: "Bloqueado en 45 minutos." },
    { id: "inc-8", title: "Adjunto malicioso factura_2026.pdf.exe", status: "investigacion", severity: "alta", channel: "email", days: 3, asg: "u-2", tags: ["malware", "doble_extension"], summ: "Hash bloqueado en EDR." },
  ];

  const incidents = incidentsRaw.map((raw) => {
    const created = subDays(raw.days);
    const closed = ["cerrado", "falso_positivo"].includes(raw.status) ? addHours(created, 3) : null;
    const sla = addHours(created, SLA_H[raw.severity]);
    return {
      id: raw.id,
      title: raw.title,
      description: raw.title,
      status: raw.status,
      severity: raw.severity,
      channel: raw.channel,
      assignee_id: raw.asg,
      tags: raw.tags,
      sla_due_at: sla,
      closed_at: closed,
      created_at: created,
      updated_at: created,
      summary: { executive_summary: raw.summ }
    };
  });

  const incidentEvents = [];
  incidents.forEach((inc) => {
    incidentEvents.push({
      id: `ev-${inc.id}-1`,
      incident_id: inc.id,
      event_type: "creado",
      actor_id: "u-1",
      payload: { source: "seed" },
      created_at: inc.created_at
    });
    if (inc.status !== "nuevo") {
      incidentEvents.push({
        id: `ev-${inc.id}-2`,
        incident_id: inc.id,
        event_type: "cambio_estado",
        actor_id: "u-2",
        payload: { to: inc.status },
        created_at: addHours(inc.created_at, 1)
      });
    }
  });

  const iocsRaw = [
    ["dominio", "paypal-secure-login.example", 7],
    ["url", "https://paypal-secure-login.example/verify", 3],
    ["dominio", "bbva-seguro-online.example", 5],
    ["dominio", "santander-seguro.example", 2],
    ["dominio", "bbva-acceso.example", 3],
    ["dominio", "banco-madrid-seguro.example", 1],
    ["ip", "203.0.113.5", 4],
    ["ip", "198.51.100.77", 2],
    ["hash", "5d41402abc4b2a76b9719d911017c592", 1],
    ["telefono", "+34900000123", 7],
    ["email", "facturacion@proveedor-seguro.example", 1]
  ];

  const indicators = iocsRaw.map(([t, v, hits], idx) => ({
    id: `ioc-${idx + 1}`,
    type: t,
    value: v,
    value_normalized: normalize(v),
    hit_count: hits,
    is_active: true,
    first_seen: subDays(30),
    last_seen: subDays(1),
    attrs: { source: "seed" }
  }));

  const ruleLists = [
    { id: "rl-1", name: "Dominios typosquat activos", kind: "blacklist", is_active: true, created_at: subDays(30) },
    { id: "rl-2", name: "Dominios corporativos banco", kind: "whitelist", is_active: true, created_at: subDays(30) }
  ];

  const ruleEntries = [
    { id: 1, list_id: "rl-1", value: "paypal-secure-login.example", value_normalized: normalize("paypal-secure-login.example"), reason: "Suplantación de marca", expires_at: null },
    { id: 2, list_id: "rl-1", value: "bbva-seguro-online.example", value_normalized: normalize("bbva-seguro-online.example"), reason: "Suplantación de marca", expires_at: null },
    { id: 3, list_id: "rl-1", value: "santander-seguro.example", value_normalized: normalize("santander-seguro.example"), reason: "Suplantación de marca", expires_at: null },
    { id: 4, list_id: "rl-2", value: "banco.example", value_normalized: normalize("banco.example"), reason: "Dominio corporativo", expires_at: null },
    { id: 5, list_id: "rl-2", value: "sso.banco.example", value_normalized: normalize("sso.banco.example"), reason: "Dominio corporativo", expires_at: null },
    { id: 6, list_id: "rl-2", value: "phishguard.bank", value_normalized: normalize("phishguard.bank"), reason: "Dominio corporativo", expires_at: null },
  ];

  const docs = [
    {
      id: "doc-1",
      title: "Playbook de respuesta ante phishing",
      category: "playbook",
      source_url: null,
      chunks: [
        "Ante una detección de phishing: 1) confirmar el veredicto con dos señales independientes; 2) bloquear el dominio en DNS y WAF; 3) notificar al cliente afectado; 4) registrar evidencias con hash SHA-256.",
        "El SLA de respuesta es: crítica 30 minutos, alta 2 horas, media 8 horas, baja 24 horas. Toda brecha de SLA se escala al CISO."
      ]
    },
    {
      id: "doc-2",
      title: "Guía de clones de BBVA y suplantación de marca",
      category: "playbook",
      source_url: null,
      chunks: [
        "Ante un clon de BBVA: capturar el sitio, solicitar takedown al registrador, bloquear el dominio en el proxy y añadirlo a la blacklist de dominios typosquat. Revisar logs por accesos de clientes al dominio.",
        "Los clones suelen registrarse pocos días antes de la campaña y usar certificados gratuitos."
      ]
    },
    {
      id: "doc-3",
      title: "Política de retención de datos",
      category: "politica",
      source_url: null,
      chunks: [
        "Los incidentes y sus evidencias se conservan 7 años. Los logs de auditoría son de solo escritura (append-only). Los datasets crudos de ETL se conservan 3 años."
      ]
    },
    {
      id: "doc-4",
      title: "Análisis de homograph attacks",
      category: "playbook",
      source_url: null,
      chunks: [
        "Los ataques homograph usan caracteres Unicode similares (p. ej. cirílico). Normalizar a punycode y comparar contra marcas conocidas. Dominios con distancia de Levenshtein menor o igual a 2 respecto a una marca deben marcarse como sospechosos."
      ]
    }
  ];

  const ragChunks = [];
  let chunkCounter = 1;
  docs.forEach((d) => {
    d.chunks.forEach((c, idx) => {
      ragChunks.push({
        id: chunkCounter++,
        document_id: d.id,
        document_title: d.title,
        chunk_index: idx,
        content: c
      });
    });
  });

  const datasetVersions = [
    {
      id: "ds-1",
      source_name: "sample",
      license: "Demo",
      checksum_sha256: "0000000000000000000000000000000000000000000000000000000000000000",
      row_count: 5,
      source_url: "builtin://seed",
      ingested_at: subDays(15)
    }
  ];

  const campaign = {
    id: "camp-1",
    name: "Concientización Q1 — Phishing genérico",
    status: "completed",
    launched_at: subDays(30),
    template: { subject: "Actualiza tu contraseña", body: "Haz clic para actualizar..." },
    created_at: subDays(35)
  };

  const campaignTargets = [
    { id: 1, campaign_id: "camp-1", email_hash: "hash-emp0", department: "Retail", sent_at: subDays(30), clicked_at: subDays(30), reported_at: null },
    { id: 2, campaign_id: "camp-1", email_hash: "hash-emp1", department: "Retail", sent_at: subDays(30), clicked_at: subDays(30), reported_at: null },
    { id: 3, campaign_id: "camp-1", email_hash: "hash-emp2", department: "Retail", sent_at: subDays(30), clicked_at: null, reported_at: null },
    { id: 4, campaign_id: "camp-1", email_hash: "hash-emp3", department: "Retail", sent_at: subDays(30), clicked_at: null, reported_at: subDays(30) },
    { id: 5, campaign_id: "camp-1", email_hash: "hash-emp4", department: "Retail", sent_at: subDays(30), clicked_at: null, reported_at: subDays(30) },
    { id: 6, campaign_id: "camp-1", email_hash: "hash-emp5", department: "Retail", sent_at: subDays(30), clicked_at: null, reported_at: null },
  ];

  const detections = [];
  let detCounter = 1;

  incidents.forEach((inc, k) => {
    const numDets = ["critica", "alta"].includes(inc.severity) ? 3 : 1;
    for (let n = 0; n < numDets; n++) {
      detections.push({
        id: `det-${detCounter++}`,
        incident_id: inc.id,
        verdict: "phishing",
        confidence: Number((0.85 + 0.01 * n).toFixed(2)),
        channel: inc.channel,
        detected_at: addHours(inc.created_at, n * 0.1),
        meta: { url: iocsRaw[k % iocsRaw.length][1], reasons: ["seed"] }
      });
    }
  });

  for (let d = 1; d <= 28; d++) {
    detections.push({
      id: `det-${detCounter++}`,
      incident_id: null,
      verdict: "benigno",
      confidence: 0.97,
      channel: ["email", "web", "sms"][d % 3],
      detected_at: subDays(d, 2),
      meta: { url: "www.banco.example" }
    });
    if (d % 4 === 0) {
      detections.push({
        id: `det-${detCounter++}`,
        incident_id: null,
        verdict: "sospechoso",
        confidence: 0.55,
        channel: "email",
        detected_at: subDays(d),
        meta: {}
      });
    }
  }

  const auditLogs = [
    { id: 1, actor_id: "u-1", actor_email: "admin@phishguard.bank", action: "auth.login", resource: "seed", payload: {}, created_at: subDays(10), ip_address: "127.0.0.1" },
    { id: 2, actor_id: "u-1", actor_email: "admin@phishguard.bank", action: "incident.update", resource: "incidents", payload: {}, created_at: subDays(8), ip_address: "127.0.0.1" },
    { id: 3, actor_id: "u-1", actor_email: "admin@phishguard.bank", action: "etl.execute", resource: "dataset_versions", payload: {}, created_at: subDays(5), ip_address: "127.0.0.1" },
    { id: 4, actor_id: "u-1", actor_email: "admin@phishguard.bank", action: "rule_entry.create", resource: "rule_entries", payload: {}, created_at: subDays(3), ip_address: "127.0.0.1" },
  ];

  return {
    users,
    roles: ROLES_DEF,
    incidents,
    incidentEvents,
    indicators,
    ruleLists,
    ruleEntries,
    docs,
    ragChunks,
    datasetVersions,
    campaigns: [campaign],
    campaignTargets,
    detections,
    auditLogs
  };
}

class DataStore {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    const initial = getInitialData();
    this.save(initial);
    return initial;
  }

  save(data = this.data) {
    this.data = data;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }

  audit(action, resource, payload = {}, actor = null) {
    const log = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      actor_id: actor?.id || "u-1",
      actor_email: actor?.email || "admin@phishguard.bank",
      action,
      resource,
      payload,
      created_at: new Date().toISOString(),
      ip_address: "127.0.0.1"
    };
    this.data.auditLogs.unshift(log);
    this.save();
    return log;
  }
}

export const store = new DataStore();
export { normalize, PERMS, ROLES_DEF };
