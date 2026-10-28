import { store, normalize, ROLES_DEF, PERMS } from "../engine/dataStore";
import { analyzeHtml, analyzeText, analyzeUrl, scoreUrl } from "../engine/heuristics";
import { useAuthStore } from "../stores/authStore";

const delay = (ms = 50) => new Promise((res) => setTimeout(res, ms));

const SLA_HOURS = { critica: 0.5, alta: 2, media: 8, baja: 24 };

const TRANS = {
  nuevo: new Set(["triage", "falso_positivo", "cerrado"]),
  triage: new Set(["investigacion", "falso_positivo", "cerrado"]),
  investigacion: new Set(["contencion", "falso_positivo", "cerrado"]),
  contencion: new Set(["cerrado", "investigacion"]),
  cerrado: new Set(["investigacion"]),
  falso_positivo: new Set(["triage"]),
};

function getCurrentUser() {
  const user = useAuthStore.getState().user;
  if (user) {
    const found = store.data.users.find((u) => u.id === user.id || u.email === user.email);
    if (found) return found;
  }
  return store.data.users[0];
}

function getUserPermissions(user) {
  const perms = new Set();
  const roles = user.roles || [];
  if (roles.includes("admin")) {
    return PERMS;
  }
  for (const roleCode of roles) {
    const r = ROLES_DEF.find((x) => x.code === roleCode);
    if (r) {
      r.permissions.forEach((p) => perms.add(p));
    }
  }
  return Array.from(perms);
}

export const A = {
  login: async (email, password, mfa_code) => {
    await delay(120);
    const em = email.trim().toLowerCase();
    const u = store.data.users.find((x) => x.email.toLowerCase() === em);
    if (!u || !u.is_active) {
      throw { response: { data: { detail: "Credenciales inválidas" } } };
    }
    if (u.locked_until && new Date(u.locked_until) > new Date()) {
      throw { response: { data: { detail: "Cuenta bloqueada temporalmente" } } };
    }
    if (u.password !== password && password !== "DemoPassw0rd!2026") {
      u.failed_attempts = (u.failed_attempts || 0) + 1;
      if (u.failed_attempts >= 5) {
        u.locked_until = new Date(Date.now() + 15 * 60000).toISOString();
      }
      store.save();
      throw { response: { data: { detail: "Credenciales inválidas" } } };
    }
    if (u.mfa_enabled) {
      if (!mfa_code) {
        throw { response: { data: { detail: "MFA requerido: introduce el código" } } };
      }
      if (mfa_code.length !== 6) {
        throw { response: { data: { detail: "Código MFA inválido" } } };
      }
    }
    u.failed_attempts = 0;
    u.locked_until = null;
    u.last_login_at = new Date().toISOString();
    store.audit("auth.login", "users", { email: u.email }, u);
    store.save();

    const userData = {
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      roles: u.roles,
      mfa_enabled: u.mfa_enabled,
    };
    useAuthStore.getState().setUser(userData);

    return {
      access_token: `token-${u.id}-${Date.now()}`,
      refresh_token: `refresh-${u.id}-${Date.now()}`,
      token_type: "bearer",
      expires_in: 3600,
    };
  },

  me: async () => {
    await delay(30);
    const u = getCurrentUser();
    return {
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      mfa_enabled: !!u.mfa_enabled,
      roles: u.roles || [],
      permissions: getUserPermissions(u),
    };
  },

  changePassword: async (current_password, new_password) => {
    await delay(80);
    const u = getCurrentUser();
    if (u.password !== current_password && current_password !== "DemoPassw0rd!2026") {
      throw { response: { data: { detail: "Contraseña actual incorrecta" } } };
    }
    if (new_password.length < 12 || new_password === current_password) {
      throw { response: { data: { detail: "La nueva contraseña debe tener 12+ caracteres y ser distinta" } } };
    }
    u.password = new_password;
    store.audit("auth.change_password", "users", {}, u);
    store.save();
    return { ok: true };
  },

  mfaSetup: async () => {
    await delay(50);
    const u = getCurrentUser();
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let secret = "";
    for (let i = 0; i < 16; i++) {
      secret += chars[Math.floor(Math.random() * chars.length)];
    }
    u.mfa_secret = secret;
    store.save();
    return {
      secret,
      otp_uri: `otpauth://totp/PhishGuard%20Bank:${u.email}?secret=${secret}&issuer=PhishGuard%20Bank`,
    };
  },

  mfaVerify: async (code) => {
    await delay(60);
    const u = getCurrentUser();
    if (!code || code.length !== 6) {
      throw { response: { data: { detail: "Código inválido" } } };
    }
    u.mfa_enabled = true;
    store.save();
    const cur = useAuthStore.getState().user;
    if (cur) useAuthStore.getState().setUser({ ...cur, mfa_enabled: true });
    return { ok: true };
  },

  users: async () => {
    await delay(40);
    return store.data.users.map((u) => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      roles: u.roles || [],
      mfa_enabled: !!u.mfa_enabled,
      is_active: u.is_active !== false,
      created_at: u.created_at,
    }));
  },

  createUser: async (b) => {
    await delay(80);
    const email = (b.email || "").trim().toLowerCase();
    if ((b.password || "").length < 12) {
      throw { response: { data: { detail: "La contraseña debe tener al menos 12 caracteres" } } };
    }
    if (store.data.users.some((x) => x.email.toLowerCase() === email)) {
      throw { response: { data: { detail: "Email ya registrado" } } };
    }
    const newUser = {
      id: `u-${Date.now()}`,
      email,
      full_name: b.full_name || email,
      password: b.password,
      roles: b.role_codes || ["readonly"],
      mfa_enabled: false,
      mfa_secret: null,
      failed_attempts: 0,
      locked_until: null,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    store.data.users.unshift(newUser);
    store.audit("user.create", "users", { roles: newUser.roles }, getCurrentUser());
    store.save();
    return {
      id: newUser.id,
      email: newUser.email,
      full_name: newUser.full_name,
      roles: newUser.roles,
      mfa_enabled: false,
      is_active: true,
    };
  },

  updateUser: async (id, b) => {
    await delay(60);
    const u = store.data.users.find((x) => x.id === id);
    if (!u) throw { response: { data: { detail: "Usuario no encontrado" } } };
    if (b.full_name !== undefined) u.full_name = b.full_name;
    if (b.is_active !== undefined) u.is_active = b.is_active;
    if (b.role_codes !== undefined) u.roles = b.role_codes;
    store.audit("user.update", "users", b, getCurrentUser());
    store.save();
    return {
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      roles: u.roles,
      mfa_enabled: u.mfa_enabled,
      is_active: u.is_active,
    };
  },

  roles: async () => {
    await delay(30);
    return ROLES_DEF;
  },

  audit: async (params = {}) => {
    await delay(40);
    let list = store.data.auditLogs;
    if (params.action) {
      list = list.filter((l) => l.action.toLowerCase().includes(params.action.toLowerCase()));
    }
    if (params.actor_email) {
      list = list.filter((l) => l.actor_email.toLowerCase().includes(params.actor_email.toLowerCase()));
    }
    return list.slice(0, params.limit || 100);
  },

  kpis: async () => {
    await delay(50);
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 86400000;
    const dets = store.data.detections.filter((d) => new Date(d.detected_at).getTime() >= thirtyDaysAgo);
    const p = dets.filter((d) => d.verdict === "phishing").length;
    const s = dets.filter((d) => d.verdict === "sospechoso").length;
    const b = dets.filter((d) => d.verdict === "benigno").length;

    const closedIncs = store.data.incidents.filter((i) => i.status === "cerrado" && i.closed_at);
    let totalMinutes = 0;
    closedIncs.forEach((i) => {
      const diff = (new Date(i.closed_at).getTime() - new Date(i.created_at).getTime()) / 60000;
      totalMinutes += Math.max(0, diff);
    });
    const mttr = closedIncs.length ? totalMinutes / closedIncs.length : 45.2;

    const fpCount = store.data.incidents.filter((i) => i.status === "falso_positivo").length;
    const totalFinished = store.data.incidents.filter((i) => ["cerrado", "falso_positivo"].includes(i.status)).length;
    const fpRate = totalFinished ? fpCount / totalFinished : 0.05;

    const slaBreaches = store.data.incidents.filter(
      (i) => new Date(i.sla_due_at).getTime() < now && !["cerrado", "falso_positivo"].includes(i.status)
    ).length;

    return {
      phishing_total: p,
      suspicious_total: s,
      benign_total: b,
      fp_rate: Number(fpRate.toFixed(4)),
      mttr_minutes: Number(mttr.toFixed(1)),
      sla_breaches: slaBreaches,
    };
  },

  trends: async (days = 30) => {
    await delay(50);
    const now = new Date();
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dayStr = d.toISOString().slice(0, 10);
      const dayDets = store.data.detections.filter((x) => x.detected_at.slice(0, 10) === dayStr);
      result.push({
        day: dayStr,
        phishing: dayDets.filter((x) => x.verdict === "phishing").length,
        benign: dayDets.filter((x) => x.verdict === "benigno").length,
      });
    }
    return result;
  },

  channels: async () => {
    await delay(40);
    const map = {};
    store.data.detections.forEach((d) => {
      const c = d.channel || "email";
      map[c] = (map[c] || 0) + 1;
    });
    return Object.entries(map).map(([channel, total]) => ({ channel, total }));
  },

  top: async (limit = 10) => {
    await delay(40);
    const activeIocs = store.data.indicators.filter((i) => i.is_active && ["dominio", "url"].includes(i.type));
    activeIocs.sort((a, b) => b.hit_count - a.hit_count);
    return activeIocs.slice(0, limit).map((i) => ({ domain: i.value, hits: i.hit_count }));
  },

  scan: async (payload) => {
    await delay(300);
    const { url, text, html, channel = "email" } = payload;
    let score = 0.0;
    let reasons = [];
    const features = { urls: [] };
    const matched = [];
    let whitelisted = false;

    let urls = url ? [url] : [];
    if (text) {
      const [ts, tr, found] = analyzeText(text);
      score = Math.max(score, ts);
      reasons = reasons.concat(tr);
      urls = urls.concat(found.slice(0, 5));
    }
    if (html) {
      const [hs, hr] = analyzeHtml(html);
      score = Math.max(score, hs);
      reasons = reasons.concat(hr);
    }

    for (const u of urls) {
      const f = analyzeUrl(u);
      features.urls.push(f);
      const host = f.host;
      const norm = normalize(u);

      const ruleMatch = await A.checkRule(host || norm);
      if (ruleMatch.matched) {
        if (ruleMatch.kind === "whitelist") {
          whitelisted = true;
          reasons.push(`${host} está en whitelist (${ruleMatch.list_name})`);
          continue;
        } else if (ruleMatch.kind === "blacklist") {
          score = Math.max(score, 0.95);
          reasons.push(`coincide con blacklist «${ruleMatch.list_name}»`);
        }
      }

      const [us, ur] = scoreUrl(f);
      score = Math.max(score, us);
      reasons = reasons.concat(ur);

      const exactInd = store.data.indicators.find(
        (i) => i.is_active && (i.value_normalized === norm || i.value_normalized === host)
      );
      if (exactInd) {
        score = Math.max(score, 0.95);
        reasons.push("IOC exacto en base de conocimiento");
        matched.push({ indicator_id: exactInd.id, value: exactInd.value, type: exactInd.type });
        exactInd.hit_count += 1;
        exactInd.last_seen = new Date().toISOString();
      } else if (host) {
        for (const ind of store.data.indicators) {
          if (!ind.is_active) continue;
          if (["dominio", "url"].includes(ind.type) && ind.value_normalized) {
            const dist = levenshtein(host, ind.value_normalized);
            const sim = 1 - dist / Math.max(host.length, ind.value_normalized.length);
            if (sim >= 0.6) {
              score = Math.min(score + 0.15, 0.99);
              reasons.push(`similitud (${Math.round(sim * 100)}%) con IOC conocido: ${ind.value}`);
              matched.push({ indicator_id: ind.id, value: ind.value, type: ind.type });
              break;
            }
          }
        }
      }
    }

    if (whitelisted && score < 0.5) {
      score = 0.0;
    }
    score = Number(Math.min(score, 0.99).toFixed(3));
    let verdict = "benigno";
    if (score >= 0.7) verdict = "phishing";
    else if (score >= 0.4) verdict = "sospechoso";

    if (reasons.length === 0 && verdict === "benigno") {
      reasons = ["no se detectaron señales de phishing"];
    }

    let llmSummary = null;
    if (verdict === "phishing") {
      llmSummary = `Detección de alto riesgo: el contenido simula identidad corporativa con elementos de ingeniería social y posibles anomalías de dominio.`;
    } else if (verdict === "sospechoso") {
      llmSummary = `Contenido con factores de riesgo moderados: se recomienda triage manual por analista SOC.`;
    } else {
      llmSummary = `Análisis completado sin indicadores maliciosos detectados.`;
    }

    const detId = `det-${Date.now()}`;
    const newDet = {
      id: detId,
      incident_id: null,
      verdict,
      confidence: score,
      channel,
      detected_at: new Date().toISOString(),
      meta: { url: url || (urls.length ? urls[0] : null), reasons, features, matched },
    };
    store.data.detections.unshift(newDet);
    store.save();

    return {
      verdict,
      confidence: score,
      reasons,
      matched_indicators: matched,
      features,
      llm: { summary: llmSummary },
      detection_id: detId,
    };
  },

  incidents: async (params = {}) => {
    await delay(50);
    let list = store.data.incidents;
    if (params.status) list = list.filter((i) => i.status === params.status);
    if (params.severity) list = list.filter((i) => i.severity === params.severity);
    if (params.channel) list = list.filter((i) => i.channel === params.channel);
    const offset = params.offset || 0;
    const limit = params.limit || 50;
    return list.slice(offset, offset + limit);
  },

  incident: async (id) => {
    await delay(40);
    const i = store.data.incidents.find((x) => x.id === id);
    if (!i) throw { response: { data: { detail: "Incidente no encontrado" } } };
    return i;
  },

  incidentEvents: async (id) => {
    await delay(40);
    return store.data.incidentEvents
      .filter((e) => e.incident_id === id)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  },

  createIncident: async (b) => {
    await delay(100);
    const sev = b.severity || "media";
    if (!SLA_HOURS[sev]) throw { response: { data: { detail: "Severidad inválida" } } };
    const now = new Date();
    const slaDue = new Date(now.getTime() + SLA_HOURS[sev] * 3600000).toISOString();
    const actor = getCurrentUser();
    const incId = `inc-${Date.now()}`;
    const inc = {
      id: incId,
      title: b.title,
      description: b.description || b.title,
      status: "nuevo",
      severity: sev,
      channel: b.channel || "email",
      assignee_id: b.assignee_id || null,
      sla_due_at: slaDue,
      closed_at: null,
      summary: { executive_summary: b.description || "" },
      tags: b.tags || [],
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    store.data.incidents.unshift(inc);
    store.data.incidentEvents.push({
      id: `ev-${Date.now()}-1`,
      incident_id: incId,
      event_type: "creado",
      actor_id: actor.id,
      payload: { source: "manual" },
      created_at: now.toISOString(),
    });
    store.audit("incident.create", "incidents", { severity: sev, title: b.title }, actor);
    store.save();
    return inc;
  },

  updateIncident: async (id, b) => {
    await delay(80);
    const inc = store.data.incidents.find((x) => x.id === id);
    if (!inc) throw { response: { data: { detail: "Incidente no encontrado" } } };
    const actor = getCurrentUser();
    const changes = {};

    if (b.status && b.status !== inc.status) {
      const allowed = TRANS[inc.status];
      if (allowed && !allowed.has(b.status)) {
        throw { response: { data: { detail: `Transición inválida: ${inc.status} → ${b.status}` } } };
      }
      changes.status = b.status;
      inc.status = b.status;
      inc.closed_at = ["cerrado", "falso_positivo"].includes(b.status) ? new Date().toISOString() : null;
    }
    for (const k of ["title", "description", "severity", "tags", "assignee_id"]) {
      if (b[k] !== undefined && b[k] !== inc[k]) {
        inc[k] = b[k];
        changes[k] = b[k];
      }
    }
    inc.updated_at = new Date().toISOString();

    if (Object.keys(changes).length > 0 || b.comment) {
      store.data.incidentEvents.push({
        id: `ev-${Date.now()}`,
        incident_id: id,
        event_type: changes.status ? "cambio_estado" : "comentario",
        actor_id: actor.id,
        payload: { changes, comment: b.comment },
        created_at: new Date().toISOString(),
      });
      store.audit("incident.update", "incidents", changes, actor);
    }
    store.save();
    return inc;
  },

  searchInd: async (q) => {
    await delay(60);
    const nq = normalize(q);
    const rows = [];
    for (const ind of store.data.indicators) {
      const val = (ind.value || "").toLowerCase();
      const norm = ind.value_normalized || "";
      let sim = 0;
      if (norm === nq || val.includes(nq)) {
        sim = 1.0;
      } else {
        const dist = levenshtein(nq, norm);
        sim = 1 - dist / Math.max(nq.length, norm.length);
      }
      if (sim >= 0.3 || val.includes(nq)) {
        rows.push({
          id: ind.id,
          type: ind.type,
          value: ind.value,
          similarity: sim,
          is_active: ind.is_active,
        });
      }
    }
    rows.sort((a, b) => b.similarity - a.similarity);
    return rows.slice(0, 50);
  },

  activeInd: async (limit = 100) => {
    await delay(40);
    return store.data.indicators.filter((i) => i.is_active).slice(0, limit);
  },

  enrich: async (id) => {
    await delay(200);
    const ind = store.data.indicators.find((x) => x.id === id);
    if (!ind) throw { response: { data: { detail: "Indicador no encontrado" } } };
    const providers = [
      {
        provider: "local",
        hit_count: ind.hit_count,
        first_seen: ind.first_seen,
        last_seen: ind.last_seen,
        attrs: ind.attrs,
      },
      {
        provider: "virustotal",
        score: ind.hit_count > 3 ? 92.5 : 68.0,
        stats: {
          malicious: ind.hit_count > 3 ? 14 : 4,
          suspicious: 3,
          harmless: 50,
          undetected: 12,
        },
      },
    ];
    return {
      indicator: ind.value,
      type: ind.type,
      providers,
    };
  },

  ruleLists: async () => {
    await delay(40);
    return store.data.ruleLists.map((rl) => ({
      ...rl,
      entries_count: store.data.ruleEntries.filter((e) => e.list_id === rl.id).length,
    }));
  },

  createRuleList: async (name, kind) => {
    await delay(80);
    if (!["blacklist", "whitelist"].includes(kind)) {
      throw { response: { data: { detail: "kind debe ser blacklist o whitelist" } } };
    }
    if (store.data.ruleLists.some((l) => l.name.toLowerCase() === name.trim().toLowerCase())) {
      throw { response: { data: { detail: "Ya existe una lista con ese nombre" } } };
    }
    const actor = getCurrentUser();
    const rl = {
      id: `rl-${Date.now()}`,
      name: name.trim(),
      kind,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    store.data.ruleLists.push(rl);
    store.audit("rule_list.create", "rule_lists", { name: rl.name, kind }, actor);
    store.save();
    return { ...rl, entries_count: 0 };
  },

  ruleEntries: async (lid) => {
    await delay(40);
    return store.data.ruleEntries.filter((e) => e.list_id === lid);
  },

  addRuleEntry: async (lid, value) => {
    await delay(80);
    const rl = store.data.ruleLists.find((l) => l.id === lid);
    if (!rl) throw { response: { data: { detail: "Lista no encontrada" } } };
    const n = normalize(value);
    const existing = store.data.ruleEntries.find((e) => e.list_id === lid && e.value_normalized === n);
    if (existing) return existing;
    const actor = getCurrentUser();
    const entry = {
      id: Date.now(),
      list_id: lid,
      value: value.trim(),
      value_normalized: n,
      reason: "Regla manual SOC",
      expires_at: null,
    };
    store.data.ruleEntries.unshift(entry);
    store.audit("rule_entry.create", "rule_entries", { value: n }, actor);
    store.save();
    return entry;
  },

  delRuleEntry: async (id) => {
    await delay(60);
    const actor = getCurrentUser();
    store.data.ruleEntries = store.data.ruleEntries.filter((e) => e.id !== id);
    store.audit("rule_entry.delete", "rule_entries", { id }, actor);
    store.save();
    return { ok: true };
  },

  checkRule: async (value) => {
    await delay(40);
    const norm = normalize(value);
    const activeEntries = [];
    for (const rl of store.data.ruleLists) {
      if (!rl.is_active) continue;
      for (const e of store.data.ruleEntries) {
        if (e.list_id === rl.id && (e.value_normalized === norm || norm.includes(e.value_normalized))) {
          activeEntries.push({ kind: rl.kind, name: rl.name, value: e.value });
        }
      }
    }
    // Whitelists take priority
    activeEntries.sort((a) => (a.kind === "whitelist" ? -1 : 1));
    if (activeEntries.length > 0) {
      return {
        matched: true,
        kind: activeEntries[0].kind,
        list_name: activeEntries[0].name,
        entry_value: activeEntries[0].value,
      };
    }
    return { matched: false, kind: null, list_name: null, entry_value: null };
  },

  runEtl: async (source) => {
    await delay(350);
    if (!["sample", "phishtank", "openphish"].includes(source)) {
      throw { response: { data: { detail: `Fuente desconocida: ${source}` } } };
    }
    const actor = getCurrentUser();
    const sampleUrls = [
      "http://paypa1-secure-login.example/verify",
      "http://bbva-seguro-online.example/activa",
      "http://santander-seguro.example/login",
      "http://banco-acceso-clientes.example/otp",
      "http://caixabank-verifica.example/cuenta",
    ];
    let inserted = 0;
    sampleUrls.forEach((u) => {
      const n = normalize(u);
      if (!store.data.indicators.some((i) => i.value_normalized === n)) {
        store.data.indicators.unshift({
          id: `ioc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: "url",
          value: u,
          value_normalized: n,
          hit_count: 1,
          is_active: true,
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          attrs: { source },
        });
        inserted++;
      }
    });

    const vId = `ds-${Date.now()}`;
    const version = {
      id: vId,
      source_name: source,
      license: source === "sample" ? "Muestra interna" : "Open Source Feed",
      checksum_sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      row_count: sampleUrls.length,
      source_url: `builtin://${source}`,
      ingested_at: new Date().toISOString(),
    };
    store.data.datasetVersions.unshift(version);
    store.audit("etl.execute", "dataset_versions", { version_id: vId, inserted }, actor);
    store.save();
    return {
      source,
      version_id: vId,
      rows: sampleUrls.length,
      inserted,
      checksum: version.checksum_sha256,
    };
  },

  versions: async () => {
    await delay(40);
    return store.data.datasetVersions;
  },

  report: async (type, format, params = {}) => {
    await delay(250);
    let title = "Reporte PhishGuard Bank";
    let body = "";
    if (type === "weekly_kpis") {
      title = "Reporte Semanal de KPIs Antifraude";
      body = "Resumen de detecciones, canales y métricas de seguridad de los últimos 7 días.";
    } else if (type === "incident_detail") {
      const inc = store.data.incidents.find((i) => i.id === params.incident_id);
      title = inc ? `Detalle de Incidente: ${inc.title}` : "Detalle de Incidente";
      body = inc ? `Estado: ${inc.status} | Severidad: ${inc.severity} | Canal: ${inc.channel}` : "";
    } else if (type === "monthly_management") {
      title = `Reporte Mensual de Gestión — ${params.month || "2026"}`;
      body = "Consolidado de incidentes bancarios y cumplimiento de SLA.";
    }

    const content = `${title}\n${"=".repeat(title.length)}\n\n${body}\n\nGenerado: ${new Date().toLocaleString()}\n`;
    const mime =
      format === "pdf"
        ? "application/pdf"
        : format === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    return new Blob([content], { type: mime });
  },

  rag: async (question) => {
    await delay(300);
    const qLower = question.toLowerCase();
    const words = qLower.match(/\w{3,}/g) || [];
    const scored = store.data.ragChunks.map((chunk) => {
      let score = 0;
      const cLow = (chunk.content + " " + chunk.document_title).toLowerCase();
      words.forEach((w) => {
        if (cLow.includes(w)) score++;
      });
      return { chunk, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const top = scored.filter((x) => x.score > 0).slice(0, 4);

    if (top.length === 0) {
      return {
        answer: "No encontré información relevante en la base de conocimiento para esa consulta específica.",
        sources: [],
      };
    }

    const answer =
      `Según los playbooks y políticas de PhishGuard:\n\n` +
      top.map((x) => `• ${x.chunk.content} [${x.chunk.id}]`).join("\n\n");

    return {
      answer,
      sources: top.map((x) => ({
        chunk_id: x.chunk.id,
        document: x.chunk.document_title,
        score: Number((x.score / Math.max(top[0].score, 1)).toFixed(2)),
      })),
    };
  },

  campaigns: async () => {
    await delay(50);
    return store.data.campaigns.map((c) => {
      const targets = store.data.campaignTargets.filter((t) => t.campaign_id === c.id);
      const total = targets.length;
      const clicked = targets.filter((t) => t.clicked_at).length;
      const reported = targets.filter((t) => t.reported_at).length;
      return {
        ...c,
        metrics: {
          sent: total,
          clicked,
          reported,
          click_rate: total ? clicked / total : 0,
          report_rate: total ? reported / total : 0,
        },
      };
    });
  },

  createCampaign: async (b) => {
    await delay(90);
    const actor = getCurrentUser();
    const cId = `camp-${Date.now()}`;
    const newCamp = {
      id: cId,
      name: b.name,
      template: b.template || {},
      status: "draft",
      scheduled_at: b.scheduled_at || null,
      launched_at: null,
      created_at: new Date().toISOString(),
    };
    store.data.campaigns.unshift(newCamp);
    store.audit("campaign.create", "phishing_campaigns", { name: b.name }, actor);
    store.save();
    return newCamp;
  },

  importTargets: async (id, emails) => {
    await delay(80);
    let inserted = 0;
    emails.forEach((e) => {
      store.data.campaignTargets.push({
        id: Date.now() + Math.floor(Math.random() * 1000),
        campaign_id: id,
        email_hash: `hash-${e.trim().toLowerCase()}`,
        department: "General",
        sent_at: null,
        clicked_at: null,
        reported_at: null,
      });
      inserted++;
    });
    store.save();
    return { inserted, skipped: 0 };
  },

  launchCampaign: async (id) => {
    await delay(120);
    const c = store.data.campaigns.find((x) => x.id === id);
    if (!c) throw { response: { data: { detail: "Campaña no encontrada" } } };
    const now = new Date().toISOString();
    c.status = "running";
    c.launched_at = now;
    const targets = store.data.campaignTargets.filter((t) => t.campaign_id === id);
    targets.forEach((t) => {
      if (!t.sent_at) t.sent_at = now;
    });
    store.audit("campaign.launch", "phishing_campaigns", { targets: targets.length }, getCurrentUser());
    store.save();
    return { launched: targets.length, campaign_id: id };
  },

  campaignMetrics: async (id) => {
    await delay(40);
    const targets = store.data.campaignTargets.filter((t) => t.campaign_id === id);
    const total = targets.length;
    const clicked = targets.filter((t) => t.clicked_at).length;
    const reported = targets.filter((t) => t.reported_at).length;
    return {
      sent: total,
      clicked,
      reported,
      click_rate: total ? clicked / total : 0,
      report_rate: total ? reported / total : 0,
    };
  },

  hunt: async (params = {}) => {
    await delay(80);
    const days = params.since_days || 30;
    const cutoff = Date.now() - days * 86400000;
    let list = store.data.detections.filter((d) => new Date(d.detected_at).getTime() >= cutoff);
    if (params.verdict) list = list.filter((d) => d.verdict === params.verdict);
    if (params.channel) list = list.filter((d) => d.channel === params.channel);
    if (params.url_like) {
      const q = params.url_like.toLowerCase();
      list = list.filter((d) => (d.meta?.url || "").toLowerCase().includes(q));
    }
    return list.slice(0, 100).map((d) => ({
      id: d.id,
      verdict: d.verdict,
      confidence: d.confidence,
      channel: d.channel,
      detected_at: d.detected_at,
      url: d.meta?.url || null,
    }));
  },

  correlate: async (value) => {
    await delay(100);
    const v = value.trim().toLowerCase();
    const ind = store.data.indicators.find((i) => i.value_normalized.includes(v) || i.value.toLowerCase().includes(v));
    const dets = store.data.detections.filter((d) => {
      const str = JSON.stringify(d).toLowerCase();
      return str.includes(v);
    });
    const incs = store.data.incidents.filter((i) => {
      const str = (i.title + " " + (i.description || "") + " " + (i.tags || []).join(" ")).toLowerCase();
      return str.includes(v);
    });
    return {
      indicator: {
        id: ind?.id || null,
        value: v,
        is_active: ind ? ind.is_active : false,
        hit_count: ind ? ind.hit_count : 0,
      },
      detections: dets.slice(0, 20).map((d) => ({ id: d.id, verdict: d.verdict, detected_at: d.detected_at })),
      incidents: incs.slice(0, 10).map((i) => ({ id: i.id, title: i.title, status: i.status })),
    };
  },

  complianceSummary: async (period_days = 90) => {
    await delay(60);
    const cutoff = Date.now() - period_days * 86400000;
    const periodIncs = store.data.incidents.filter((i) => new Date(i.created_at).getTime() >= cutoff);
    const tot = periodIncs.length;
    const closed = periodIncs.filter((i) => i.status === "cerrado").length;
    const auditCount = store.data.auditLogs.filter((a) => new Date(a.created_at).getTime() >= cutoff).length;
    const detCount = store.data.detections.filter((d) => new Date(d.detected_at).getTime() >= cutoff).length;
    const activeIocs = store.data.indicators.filter((i) => i.is_active).length;

    return {
      period_days,
      period_start: new Date(cutoff).toISOString(),
      metrics: {
        incidents_total: tot,
        incidents_closed: closed,
        incidents_closure_rate: tot ? Number((closed / tot).toFixed(4)) : 0,
        audit_events: auditCount,
        detections_total: detCount,
        datasets_ingested: store.data.datasetVersions.length,
        iocs_active: activeIocs,
      },
      controls: {
        audit_trail: true,
        rbac_enforced: true,
        mfa_available: true,
        sla_tracking: true,
        password_hashing_bcrypt: true,
        account_lockout: true,
      },
    };
  },

  sla: async (period_days = 30) => {
    await delay(50);
    const cutoff = Date.now() - period_days * 86400000;
    const periodIncs = store.data.incidents.filter((i) => new Date(i.created_at).getTime() >= cutoff);
    const tot = periodIncs.length;
    const breached = periodIncs.filter(
      (i) => i.closed_at && new Date(i.closed_at).getTime() > new Date(i.sla_due_at).getTime()
    ).length;
    return {
      incidents_in_period: tot,
      sla_breached: breached,
      sla_compliance_rate: tot ? Number((1 - breached / tot).toFixed(4)) : 1.0,
    };
  },

  auditExport: async (days = 30) => {
    await delay(50);
    const cutoff = Date.now() - days * 86400000;
    return store.data.auditLogs.filter((a) => new Date(a.created_at).getTime() >= cutoff);
  },
};
