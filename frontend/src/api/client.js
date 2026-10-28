import axios from "axios";
import { useAuthStore } from "../stores/authStore";
import { queryClient } from "../lib/queryClient";

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api/v1" });

api.interceptors.request.use((c) => {
  const t = useAuthStore.getState().accessToken;
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

let refreshing = null;
function forceLogout() {
  useAuthStore.getState().logout();
  queryClient.clear();
  if (window.location.pathname !== "/login") window.location.href = "/login";
}

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const orig = err.config;
    const isAuth = orig?.url?.includes("/auth/");
    if (err.response?.status === 401 && !orig._retry && !isAuth) {
      orig._retry = true;
      const rt = useAuthStore.getState().refreshToken;
      if (!rt) { forceLogout(); return Promise.reject(err); }
      if (!refreshing) {
        refreshing = axios
          .post(`${api.defaults.baseURL}/auth/refresh`, { refresh_token: rt })
          .then(({ data }) => {
            useAuthStore.getState().setTokens(data.access_token, data.refresh_token);
            return data.access_token;
          })
          .finally(() => { refreshing = null; });
      }
      try {
        const nt = await refreshing;
        orig.headers.Authorization = `Bearer ${nt}`;
        return api(orig);
      } catch { forceLogout(); }
    }
    return Promise.reject(err);
  }
);

const g = (u, params) => api.get(u, { params }).then((r) => r.data);
const p = (u, body) => api.post(u, body).then((r) => r.data);

export const A = {
  login: (email, password, mfa_code) => p("/auth/login", { email, password, mfa_code }),
  me: () => g("/auth/me"),
  changePassword: (current_password, new_password) => p("/auth/change-password", { current_password, new_password }),
  mfaSetup: () => p("/auth/mfa/setup"),
  mfaVerify: (code) => p("/auth/mfa/verify", { code }),
  users: () => g("/users", { limit: 100 }),
  createUser: (b) => p("/users", b),
  updateUser: (id, b) => api.patch(`/users/${id}`, b).then((r) => r.data),
  roles: () => g("/roles"),
  audit: (params) => g("/audit", params),
  kpis: () => g("/dashboard/kpis"),
  trends: (days = 30) => g("/dashboard/trends", { days }),
  channels: () => g("/dashboard/channels"),
  top: (limit = 10) => g("/dashboard/top-attackers", { limit }),
  scan: (b) => p("/detections/scan", b),
  incidents: (params) => g("/incidents", params),
  incident: (id) => g(`/incidents/${id}`),
  incidentEvents: (id) => g(`/incidents/${id}/events`),
  createIncident: (b) => p("/incidents", b),
  updateIncident: (id, b) => api.patch(`/incidents/${id}`, b).then((r) => r.data),
  searchInd: (q) => g("/indicators", { q }),
  activeInd: (limit = 50) => g("/indicators/active", { limit }),
  enrich: (id) => p(`/threat-intel/indicators/${id}/enrich`),
  ruleLists: () => g("/rules"),
  createRuleList: (name, kind) => p("/rules", { name, kind }),
  ruleEntries: (id) => g(`/rules/${id}/entries`),
  addRuleEntry: (id, value) => p(`/rules/${id}/entries`, { value }),
  delRuleEntry: (id) => api.delete(`/rules/entries/${id}`),
  checkRule: (value) => p("/rules/check", { value }),
  runEtl: (source) => p("/etl/run", { source }),
  versions: () => g("/etl/versions"),
  report: (type, format, params) => api.get(`/reports/${type}`, { params: { format, ...params }, responseType: "blob" }).then((r) => r.data),
  rag: (question) => p("/rag/query", { question, top_k: 5 }),
  campaigns: () => g("/campaigns"),
  createCampaign: (b) => p("/campaigns", b),
  importTargets: (id, emails) => p(`/campaigns/${id}/targets`, { emails }),
  launchCampaign: (id) => p(`/campaigns/${id}/launch`),
  campaignMetrics: (id) => g(`/campaigns/${id}/metrics`),
  hunt: (params) => g("/threat-hunting/search", params),
  correlate: (value) => g("/threat-hunting/correlate", { value }),
  complianceSummary: (period_days) => g("/compliance/summary", { period_days }),
  sla: (period_days) => g("/compliance/sla", { period_days }),
  auditExport: (days = 30) => g("/compliance/audit/export", { days }),
};
