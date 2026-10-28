import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { A } from "../api/client";
import { useAuthStore } from "../stores/authStore";
import { queryClient } from "../lib/queryClient";
import { toast, errMsg } from "../stores/toastStore";
import { ToastContainer } from "../components/ui";

export default function Login() {
  const [email, setEmail] = useState("admin@phishguard.bank");
  const [password, setPassword] = useState("DemoPassw0rd!2026");
  const [mfa, setMfa] = useState("");
  const [needMfa, setNeedMfa] = useState(false);
  const [loading, setLoading] = useState(false);
  const setTokens = useAuthStore((s) => s.setTokens);
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const d = await A.login(email, password, mfa || undefined);
      queryClient.clear();
      setTokens(d.access_token, d.refresh_token);
      toast.success("Sesión iniciada con éxito");
      nav("/dashboard", { replace: true });
    } catch (err) {
      const m = errMsg(err, "No se pudo iniciar sesión");
      if (m.includes("MFA requerido")) {
        setNeedMfa(true);
        toast.info("Introduce tu código MFA para continuar");
      } else {
        toast.error(m);
      }
    } finally {
      setLoading(false);
    }
  }

  const pickDemoUser = (userEmail) => {
    setEmail(userEmail);
    setPassword("DemoPassw0rd!2026");
    setNeedMfa(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <form onSubmit={submit} className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md space-y-4 border border-slate-200">
        <div className="text-center">
          <div className="inline-block text-4xl mb-2">🛡️</div>
          <h1 className="text-2xl font-bold text-slate-900">PhishGuard Bank</h1>
          <p className="text-sm text-slate-500">Plataforma bancaria antifishing y centro de operaciones SOC</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Email institucional</label>
          <input
            required
            type="email"
            className="w-full border border-slate-300 p-2.5 rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@phishguard.bank"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Contraseña</label>
          <input
            required
            type="password"
            className="w-full border border-slate-300 p-2.5 rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
          />
        </div>

        {needMfa && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Código de autenticación MFA (TOTP)</label>
            <input
              required
              maxLength={6}
              className="w-full border border-slate-300 p-2.5 rounded text-center tracking-widest font-mono text-base focus:border-blue-500 outline-none"
              value={mfa}
              onChange={(e) => setMfa(e.target.value)}
              placeholder="000000"
            />
          </div>
        )}

        <button
          disabled={loading}
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium p-2.5 rounded text-sm transition-colors disabled:opacity-50"
        >
          {loading ? "Entrando…" : "Entrar al SOC"}
        </button>

        <div className="border-t border-slate-200 pt-3">
          <p className="text-xs text-slate-500 font-medium mb-1.5 text-center">Usuarios de demostración disponibles:</p>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => pickDemoUser("admin@phishguard.bank")}
              className="text-left p-1.5 rounded bg-slate-50 hover:bg-slate-100 border text-slate-700 truncate"
            >
              👑 Admin (Elena)
            </button>
            <button
              type="button"
              onClick={() => pickDemoUser("maria.lopez@phishguard.bank")}
              className="text-left p-1.5 rounded bg-slate-50 hover:bg-slate-100 border text-slate-700 truncate"
            >
              🔍 Analista (María)
            </button>
            <button
              type="button"
              onClick={() => pickDemoUser("ana.torres@phishguard.bank")}
              className="text-left p-1.5 rounded bg-slate-50 hover:bg-slate-100 border text-slate-700 truncate"
            >
              📋 Auditor (Ana)
            </button>
            <button
              type="button"
              onClick={() => pickDemoUser("audit.viewer@phishguard.bank")}
              className="text-left p-1.5 rounded bg-slate-50 hover:bg-slate-100 border text-slate-700 truncate"
            >
              👁️ Readonly
            </button>
          </div>
          <p className="text-[11px] text-slate-400 text-center mt-2">Clave por defecto: DemoPassw0rd!2026</p>
        </div>
      </form>
      <ToastContainer />
    </div>
  );
}
