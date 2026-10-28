import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { A } from "../api/client";
import { useAuthStore } from "../stores/authStore";
import { queryClient } from "../lib/queryClient";
import { toast, errMsg, useToastStore } from "../stores/toastStore";
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
      nav("/dashboard", { replace: true });
    } catch (err) {
      const m = errMsg(err, "No se pudo iniciar sesión");
      if (m.includes("MFA requerido")) setNeedMfa(true);
      else toast.error(m);
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <form onSubmit={submit} className="bg-white p-8 rounded-xl shadow-lg w-96 space-y-4">
        <div className="text-center"><h1 className="text-2xl font-bold">🛡️ PhishGuard Bank</h1>
          <p className="text-sm text-slate-500">Plataforma antifishing</p></div>
        <input required type="email" className="w-full border p-2 rounded" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input required type="password" className="w-full border p-2 rounded" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" />
        {needMfa && <input required maxLength={6} className="w-full border p-2 rounded text-center tracking-widest" value={mfa} onChange={(e) => setMfa(e.target.value)} placeholder="Código MFA" />}
        <button disabled={loading} className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50">{loading ? "Entrando…" : "Entrar"}</button>
        <p className="text-xs text-slate-500 text-center">Demo: admin@phishguard.bank / DemoPassw0rd!2026</p>
      </form>
      <ToastContainer />
    </div>
  );
}
