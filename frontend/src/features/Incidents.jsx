import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { A } from "../api/client";
import { Badge, Btn, Card, DataTable, Input, Modal, PageHeader, Select, Spinner, fmt } from "../components/ui";
import { errMsg, toast } from "../stores/toastStore";

const STATES = ["nuevo", "triage", "investigacion", "contencion", "cerrado", "falso_positivo"];
const NEXT = { nuevo: ["triage", "falso_positivo", "cerrado"], triage: ["investigacion", "falso_positivo", "cerrado"],
  investigacion: ["contencion", "falso_positivo", "cerrado"], contencion: ["cerrado", "investigacion"],
  cerrado: ["investigacion"], falso_positivo: ["triage"] };
const PAGE = 20;

export function Incidents() {
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["incidents", status, severity, page],
    queryFn: () => A.incidents({ status: status || undefined, severity: severity || undefined, limit: PAGE, offset: page * PAGE }),
  });
  const cols = [
    { key: "title", header: "Título", render: (r) => <Link className="text-blue-600 hover:underline" to={`/incidents/${r.id}`}>{r.title}</Link> },
    { key: "status", header: "Estado", render: (r) => <Badge value={r.status} /> },
    { key: "severity", header: "Severidad", render: (r) => <Badge value={r.severity} /> },
    { key: "channel", header: "Canal" },
    { key: "sla", header: "SLA", render: (r) => {
      const late = new Date(r.sla_due_at) < new Date() && !["cerrado", "falso_positivo"].includes(r.status);
      return <span className={late ? "text-red-600 font-medium" : ""}>{fmt(r.sla_due_at)}</span>; } },
  ];
  return (
    <div>
      <PageHeader title="Incidentes" actions={<Btn onClick={() => setOpen(true)}>+ Nuevo</Btn>} />
      <div className="flex gap-2 mb-4">
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}><option value="">Todos los estados</option>{STATES.map((s) => <option key={s}>{s}</option>)}</Select>
        <Select value={severity} onChange={(e) => { setSeverity(e.target.value); setPage(0); }}><option value="">Todas las severidades</option>{["baja", "media", "alta", "critica"].map((s) => <option key={s}>{s}</option>)}</Select>
      </div>
      <DataTable columns={cols} rows={data} loading={isLoading} empty="No hay incidentes con estos filtros" />
      <div className="flex justify-between mt-3 text-sm">
        <button disabled={page === 0} onClick={() => setPage(page - 1)} className="px-3 py-1 border rounded disabled:opacity-40">← Anterior</button>
        <span>Página {page + 1}</span>
        <button disabled={(data?.length ?? 0) < PAGE} onClick={() => setPage(page + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Siguiente →</button>
      </div>
      <NewIncident open={open} onClose={() => setOpen(false)} onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["incidents"] }); }} />
    </div>
  );
}

function NewIncident({ open, onClose, onDone }) {
  const [f, setF] = useState({ title: "", description: "", severity: "media", channel: "email", tags: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    try {
      await A.createIncident({ ...f, tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean) });
      toast.success("Incidente creado");
      setF({ title: "", description: "", severity: "media", channel: "email", tags: "" });
      onDone();
    } catch (err) { toast.error(errMsg(err)); }
  }
  return (
    <Modal open={open} onClose={onClose} title="Nuevo incidente">
      <form onSubmit={submit} className="space-y-3">
        <Input required placeholder="Título" value={f.title} onChange={set("title")} />
        <textarea rows={3} className="w-full border p-2 rounded text-sm" placeholder="Descripción" value={f.description} onChange={set("description")} />
        <div className="grid grid-cols-2 gap-3">
          <Select value={f.severity} onChange={set("severity")}>{["baja", "media", "alta", "critica"].map((s) => <option key={s}>{s}</option>)}</Select>
          <Select value={f.channel} onChange={set("channel")}>{["email", "sms", "web", "qr", "vishing", "otro"].map((s) => <option key={s}>{s}</option>)}</Select>
        </div>
        <Input placeholder="Tags separados por coma" value={f.tags} onChange={set("tags")} />
        <Btn>Crear incidente</Btn>
      </form>
    </Modal>
  );
}

export function IncidentDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const inc = useQuery({ queryKey: ["incident", id], queryFn: () => A.incident(id) });
  const ev = useQuery({ queryKey: ["incident-events", id], queryFn: () => A.incidentEvents(id) });
  const m = useMutation({
    mutationFn: (status) => A.updateIncident(id, { status, comment: `Cambio desde UI a ${status}` }),
    onSuccess: () => { toast.success("Incidente actualizado"); qc.invalidateQueries({ queryKey: ["incident", id] }); qc.invalidateQueries({ queryKey: ["incident-events", id] }); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const i = inc.data;
  if (!i) return <Spinner />;
  return (
    <div className="space-y-4">
      <Link to="/incidents" className="text-sm text-blue-600">← Incidentes</Link>
      <Card>
        <div className="flex justify-between">
          <div><h1 className="text-2xl font-bold">{i.title}</h1>
            <div className="flex gap-2 mt-2"><Badge value={i.status} /><Badge value={i.severity} /><span className="text-sm text-slate-500">{i.channel}</span></div></div>
          <div className="text-right text-xs text-slate-500"><p>Creado: {fmt(i.created_at)}</p><p>SLA: {fmt(i.sla_due_at)}</p></div>
        </div>
        {i.description && <p className="mt-4">{i.description}</p>}
        {i.summary?.executive_summary && <div className="mt-4 bg-slate-50 p-3 rounded text-sm"><b>Resumen ejecutivo:</b> {i.summary.executive_summary}</div>}
        <div className="mt-4 flex gap-2 flex-wrap items-center"><span className="text-sm text-slate-500">Cambiar estado a:</span>
          {(NEXT[i.status] ?? []).map((s) => <button key={s} disabled={m.isPending} onClick={() => m.mutate(s)} className="text-sm border rounded px-3 py-1 hover:bg-slate-100">{s}</button>)}</div>
      </Card>
      <Card><h3 className="font-semibold mb-3">Timeline</h3>
        {!ev.data?.length ? <p className="text-sm text-slate-500">Sin eventos.</p> : (
          <ol className="space-y-2">{ev.data.map((e) => (
            <li key={e.id} className="border-l-2 border-blue-500 pl-3"><p className="text-sm font-medium">{e.event_type}</p>
              <p className="text-xs text-slate-500">{fmt(e.created_at)}</p>
              <pre className="text-xs bg-slate-50 p-1 rounded overflow-auto">{JSON.stringify(e.payload)}</pre></li>))}</ol>)}
      </Card>
    </div>
  );
}
