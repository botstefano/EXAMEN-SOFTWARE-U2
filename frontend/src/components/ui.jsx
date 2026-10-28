import { useToastStore } from "../stores/toastStore";

export const Card = ({ children, className = "" }) => <div className={`bg-white rounded-lg shadow p-4 ${className}`}>{children}</div>;

export const PageHeader = ({ title, actions }) => (
  <div className="flex justify-between items-center mb-6">
    <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
    <div className="flex gap-2">{actions}</div>
  </div>
);

export const Spinner = ({ label = "Cargando…" }) => <div className="text-sm text-slate-500 py-4">{label}</div>;
export const Empty = ({ title }) => <div className="text-center py-10 text-slate-500">{title}</div>;
export const Btn = ({ className = "", ...p }) => (
  <button {...p} className={`bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50 ${className}`} />
);
export const Input = ({ className = "", ...p }) => <input {...p} className={`w-full border p-2 rounded text-sm ${className}`} />;
export const Select = ({ className = "", ...p }) => <select {...p} className={`border p-2 rounded text-sm ${className}`} />;

const COLORS = {
  critica: "bg-red-100 text-red-800", alta: "bg-orange-100 text-orange-800", media: "bg-yellow-100 text-yellow-800",
  baja: "bg-slate-100 text-slate-800", phishing: "bg-red-100 text-red-800", sospechoso: "bg-yellow-100 text-yellow-800",
  benigno: "bg-green-100 text-green-800", nuevo: "bg-blue-100 text-blue-800", triage: "bg-indigo-100 text-indigo-800",
  investigacion: "bg-purple-100 text-purple-800", contencion: "bg-orange-100 text-orange-800",
  cerrado: "bg-slate-100 text-slate-800", falso_positivo: "bg-gray-100 text-gray-700",
  activo: "bg-green-100 text-green-800", inactivo: "bg-slate-100 text-slate-600",
  blacklist: "bg-red-100 text-red-800", whitelist: "bg-green-100 text-green-800",
};
export const Badge = ({ value }) => (
  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${COLORS[value] ?? "bg-slate-100 text-slate-700"}`}>
    {String(value).replace(/_/g, " ")}
  </span>
);

export function DataTable({ columns, rows, loading, empty = "Sin datos" }) {
  if (loading) return <Spinner />;
  if (!rows?.length) return <Empty title={empty} />;
  return (
    <div className="overflow-x-auto bg-white rounded shadow">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 text-left">
          <tr>{columns.map((c) => <th key={c.key} className="p-3 font-semibold">{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? r.domain ?? i} className="border-t hover:bg-slate-50">
              {columns.map((c) => <td key={c.key} className="p-3">{c.render ? c.render(r) : String(r[c.key] ?? "—")}</td>)}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <header className="flex justify-between items-center border-b px-5 py-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-slate-500">✕</button>
        </header>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, message, onConfirm, onCancel }) {
  return (
    <Modal open={open} onClose={onCancel} title="Confirmar">
      <p className="mb-4">{message}</p>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1 border rounded">Cancelar</button>
        <button onClick={onConfirm} className="px-3 py-1 rounded text-white bg-red-600">Confirmar</button>
      </div>
    </Modal>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const bg = { success: "bg-green-600", error: "bg-red-600", info: "bg-blue-600" };
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((t) => <div key={t.id} className={`${bg[t.kind]} text-white px-4 py-2 rounded shadow`}>{t.message}</div>)}
    </div>
  );
}

export const fmt = (d) => (d ? new Date(d).toLocaleString() : "—");
export const download = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
};
