import React from "react";
import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "../hooks/usePermissions";
import { useAuthStore } from "../stores/authStore";
import { ToastContainer } from "./ui";

const NAV = [
  ["/dashboard", "Dashboard", "dashboard:read"],
  ["/scan", "Escanear", "detection:write"],
  ["/incidents", "Incidentes", "incident:read"],
  ["/indicators", "Indicadores", "indicator:read"],
  ["/rules", "Reglas", "indicator:read"],
  ["/threat-hunting", "Threat Hunting", "detection:read"],
  ["/rag", "Asistente SOC", "soc:assistant"],
  ["/campaigns", "Campañas", "report:read"],
  ["/etl", "Datasets / ETL", "etl:read"],
  ["/reports", "Reportes", "report:generate"],
  ["/compliance", "Cumplimiento", "audit:read"],
  ["/audit", "Auditoría", "audit:read"],
  ["/users", "Usuarios", "user:manage"],
  ["/roles", "Roles", "role:manage"],
];

const linkStyle = ({ isActive }) =>
  `block px-3 py-1.5 rounded text-sm transition-colors ${
    isActive ? "bg-blue-600 text-white font-medium" : "text-slate-300 hover:bg-slate-800 hover:text-white"
  }`;

export function Protected({ children }) {
  const token = useAuthStore((s) => s.accessToken);
  return token ? children : <Navigate to="/login" replace />;
}

export function Perm({ code, children }) {
  const { has, isLoading } = usePermissions();
  if (isLoading) return <div className="p-6 text-slate-500">Cargando…</div>;
  return has(code) ? (
    children
  ) : (
    <div className="text-center py-20">
      <h1 className="text-5xl font-bold text-red-600">403</h1>
      <p className="text-slate-500 mt-2">No tienes permiso para acceder a esta sección.</p>
    </div>
  );
}

export default function Layout() {
  const { me, has } = usePermissions();
  const logout = useAuthStore((s) => s.logout);
  const qc = useQueryClient();
  const nav = useNavigate();

  const out = () => {
    logout();
    qc.clear();
    nav("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-60 bg-slate-900 text-white p-4 flex flex-col flex-shrink-0 h-screen sticky top-0 overflow-y-auto border-r border-slate-800">
        <div className="flex items-center gap-2 mb-6 px-2">
          <span className="text-2xl">🛡️</span>
          <div>
            <h1 className="text-lg font-bold leading-tight text-white">PhishGuard</h1>
            <p className="text-[10px] text-slate-400 tracking-wider font-semibold uppercase">Bank SOC Suite</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV.filter(([, , p]) => has(p)).map(([to, label]) => (
            <NavLink key={to} to={to} className={linkStyle}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-800 pt-3 space-y-1 mt-3">
          <NavLink to="/profile" className={linkStyle}>
            Mi cuenta (clave / MFA)
          </NavLink>
        </div>
      </aside>

      <main className="flex-1 p-6 min-w-0">
        <header className="flex justify-between items-center mb-6 pb-3 border-b border-slate-200">
          <div>
            <span className="text-sm font-semibold text-slate-800">{me?.full_name || "Elena Navarro (Admin)"}</span>
            <span className="ml-2 text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-medium">
              {(me?.roles || ["admin"]).join(", ")}
            </span>
          </div>
          <button
            onClick={out}
            className="text-sm font-medium text-red-600 hover:text-red-700 hover:underline transition-colors"
          >
            Cerrar sesión
          </button>
        </header>
        <Outlet />
      </main>
      <ToastContainer />
    </div>
  );
}
