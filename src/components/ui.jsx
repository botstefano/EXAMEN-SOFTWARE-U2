import React from "react";
import { useToastStore } from "../stores/toastStore";

export const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-slate-200 p-4 ${className}`}>{children}</div>
);

export const PageHeader = ({ title, actions }) => (
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
    <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
    <div className="flex gap-2 flex-wrap">{actions}</div>
  </div>
);

export const Spinner = ({ label = "Cargando…" }) => (
  <div className="flex items-center gap-2 text-sm text-slate-500 py-6">
    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    <span>{label}</span>
  </div>
);

export const Empty = ({ title = "Sin datos" }) => (
  <div className="text-center py-10 text-slate-500">{title}</div>
);

export const Btn = ({ className = "", children, ...p }) => (
  <button
    {...p}
    className={`bg-blue-600 text-white font-medium px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
  >
    {children}
  </button>
);

export const Input = ({ className = "", ...p }) => (
  <input
    {...p}
    className={`w-full border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-2 rounded text-sm outline-none transition-colors ${className}`}
  />
);

export const Select = ({ className = "", ...p }) => (
  <select
    {...p}
    className={`border border-slate-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-2 rounded text-sm outline-none ${className}`}
  />
);

const COLORS = {
  critica: "bg-red-100 text-red-800 border border-red-200",
  alta: "bg-orange-100 text-orange-800 border border-orange-200",
  media: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  baja: "bg-slate-100 text-slate-800 border border-slate-200",
  phishing: "bg-red-100 text-red-800 border border-red-200",
  sospechoso: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  benigno: "bg-green-100 text-green-800 border border-green-200",
  nuevo: "bg-blue-100 text-blue-800 border border-blue-200",
  triage: "bg-indigo-100 text-indigo-800 border border-indigo-200",
  investigacion: "bg-purple-100 text-purple-800 border border-purple-200",
  contencion: "bg-orange-100 text-orange-800 border border-orange-200",
  cerrado: "bg-slate-100 text-slate-800 border border-slate-200",
  falso_positivo: "bg-gray-100 text-gray-700 border border-gray-200",
  activo: "bg-green-100 text-green-800 border border-green-200",
  inactivo: "bg-slate-100 text-slate-600 border border-slate-200",
  blacklist: "bg-red-100 text-red-800 border border-red-200",
  whitelist: "bg-green-100 text-green-800 border border-green-200",
};

export const Badge = ({ value }) => (
  <span
    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
      COLORS[value] ?? "bg-slate-100 text-slate-700 border border-slate-200"
    }`}
  >
    {String(value || "").replace(/_/g, " ")}
  </span>
);

export function DataTable({ columns, rows, loading, empty = "Sin datos" }) {
  if (loading) return <Spinner />;
  if (!rows?.length) return <Empty title={empty} />;
  return (
    <div className="overflow-x-auto bg-white rounded border border-slate-200 shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 text-slate-700 text-left">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="p-3 font-semibold border-b border-slate-200">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <tr key={r.id ?? r.domain ?? i} className="hover:bg-slate-50 transition-colors">
              {columns.map((c) => (
                <td key={c.key} className="p-3">
                  {c.render ? c.render(r) : String(r[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex justify-between items-center border-b border-slate-200 px-5 py-3">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl font-bold px-1">
            ✕
          </button>
        </header>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, message, onConfirm, onCancel }) {
  return (
    <Modal open={open} onClose={onCancel} title="Confirmar">
      <p className="mb-4 text-slate-700">{message}</p>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 border border-slate-300 rounded text-sm text-slate-700 hover:bg-slate-100"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          className="px-3 py-1.5 rounded text-white bg-red-600 text-sm font-medium hover:bg-red-700"
        >
          Confirmar
        </button>
      </div>
    </Modal>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const bg = { success: "bg-green-600", error: "bg-red-600", info: "bg-blue-600" };
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`${bg[t.kind] || "bg-slate-800"} text-white px-4 py-2 rounded shadow-lg text-sm font-medium animate-fadeIn pointer-events-auto`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

export const fmt = (d) => (d ? new Date(d).toLocaleString() : "—");

export const download = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};
