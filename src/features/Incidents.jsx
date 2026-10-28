import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { A } from "../api/client";
import { Badge, Btn, Card, DataTable, Input, Modal, PageHeader, Select, Spinner, fmt } from "../components/ui";
import { errMsg, toast } from "../stores/toastStore";

const STATES = ["nuevo", "triage", "investigacion", "contencion", "cerrado", "falso_positivo"];

const NEXT = {
  nuevo: ["triage", "falso_positivo", "cerrado"],
  triage: ["investigacion", "falso_positivo", "cerrado"],
  investigacion: ["contencion", "falso_positivo", "cerrado"],
  contencion: ["cerrado", "investigacion"],
  cerrado: ["investigacion"],
  falso_positivo: ["triage"],
};

const PAGE = 15;

export function Incidents() {
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["incidents", status, severity, page],
    queryFn: () =>
      A.incidents({
        status: status || undefined,
        severity: severity || undefined,
        limit: PAGE,
        offset: page * PAGE,
      }),
  });

  const cols = [
    {
      key: "title",
      header: "Título",
      render: (r) => (
        <Link className="text-blue-600 font-medium hover:underline" to={`/incidents/${r.id}`}>
          {r.title}
        </Link>
      ),
    },
    { key: "status", header: "Estado", render: (r) => <Badge value={r.status} /> },
    { key: "severity", header: "Severidad", render: (r) => <Badge value={r.severity} /> },
    { key: "channel", header: "Canal", render: (r) => <span className="uppercase text-xs font-semibold">{r.channel}</span> },
    {
      key: "sla",
      header: "SLA Due",
      render: (r) => {
        const late = new Date(r.sla_due_at) < new Date() && !["cerrado", "falso_positivo"].includes(r.status);
        return (
          <span className={late ? "text-red-600 font-semibold flex items-center gap-1" : "text-slate-600"}>
            {late && <span>⚠️</span>}
            {fmt(r.sla_due_at)}
          </span>
        );
      },
    },
    {
      key: "created_at",
      header: "Creado",
      render: (r) => <span className="text-xs text-slate-500">{fmt(r.created_at)}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Gestión de Incidentes SOC" actions={<Btn onClick={() => setOpen(true)}>+ Nuevo Incidente</Btn>} />

      <div className="flex flex-wrap gap-2 mb-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm items-center">
        <span className="text-xs font-semibold text-slate-500">Filtros:</span>
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
        >
          <option value="">Todos los estados</option>
          {STATES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </Select>

        <Select
          value={severity}
          onChange={(e) => {
            setSeverity(e.target.value);
            setPage(0);
          }}
        >
          <option value="">Todas las severidades</option>
          {["baja", "media", "alta", "critica"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      <DataTable columns={cols} rows={data} loading={isLoading} empty="No hay incidentes con estos filtros" />

      <div className="flex justify-between items-center mt-3 text-sm">
        <button
          disabled={page === 0}
          onClick={() => setPage(page - 1)}
          className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 disabled:opacity-40 hover:bg-slate-50"
        >
          ← Anterior
        </button>
        <span className="text-slate-600 text-xs font-medium">Página {page + 1}</span>
        <button
          disabled={(data?.length ?? 0) < PAGE}
          onClick={() => setPage(page + 1)}
          className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 disabled:opacity-40 hover:bg-slate-50"
        >
          Siguiente →
        </button>
      </div>

      <NewIncident
        open={open}
        onClose={() => setOpen(false)}
        onDone={() => {
          setOpen(false);
          qc.invalidateQueries({ queryKey: ["incidents"] });
        }}
      />
    </div>
  );
}

function NewIncident({ open, onClose, onDone }) {
  const [f, setF] = useState({ title: "", description: "", severity: "media", channel: "email", tags: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    try {
      await A.createIncident({
        ...f,
        tags: f.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      toast.success("Incidente creado exitosamente");
      setF({ title: "", description: "", severity: "media", channel: "email", tags: "" });
      onDone();
    } catch (err) {
      toast.error(errMsg(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar Nuevo Incidente">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Título del incidente</label>
          <Input required placeholder="Ej.: Suplantación de identidad BBVA vía SMS" value={f.title} onChange={set("title")} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Descripción y detalles</label>
          <textarea
            rows={3}
            className="w-full border border-slate-300 p-2.5 rounded text-sm focus:border-blue-500 outline-none"
            placeholder="Describe las evidencias, remitente sospechoso, URLs detectadas..."
            value={f.description}
            onChange={set("description")}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Severidad</label>
            <Select className="w-full" value={f.severity} onChange={set("severity")}>
              {["baja", "media", "alta", "critica"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Canal de origen</label>
            <Select className="w-full" value={f.channel} onChange={set("channel")}>
              {["email", "sms", "web", "qr", "vishing", "otro"].map((s) => (
                <option key={s} value={s}>
                  {s.toUpperCase()}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Etiquetas (separadas por comas)</label>
          <Input placeholder="bbva, credential_harvesting, typosquat" value={f.tags} onChange={set("tags")} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded text-sm hover:bg-slate-50">
            Cancelar
          </button>
          <Btn>Crear Incidente</Btn>
        </div>
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
    mutationFn: (status) => A.updateIncident(id, { status, comment: `Cambio de estado en consola a: ${status}` }),
    onSuccess: () => {
      toast.success("Estado del incidente actualizado");
      qc.invalidateQueries({ queryKey: ["incident", id] });
      qc.invalidateQueries({ queryKey: ["incident-events", id] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const i = inc.data;
  if (!i) return <Spinner />;

  return (
    <div className="space-y-4">
      <Link to="/incidents" className="text-sm text-blue-600 hover:underline flex items-center gap-1 font-medium">
        ← Volver a la lista de incidentes
      </Link>

      <Card className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 border-b border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{i.title}</h1>
            <div className="flex gap-2 mt-2 items-center flex-wrap">
              <Badge value={i.status} />
              <Badge value={i.severity} />
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                Canal: {i.channel}
              </span>
            </div>
          </div>
          <div className="text-left md:text-right text-xs text-slate-500 space-y-0.5">
            <p>
              Creado: <span className="font-semibold">{fmt(i.created_at)}</span>
            </p>
            <p>
              SLA Límite: <span className="font-semibold text-slate-700">{fmt(i.sla_due_at)}</span>
            </p>
            {i.closed_at && (
              <p>
                Cerrado: <span className="font-semibold text-green-700">{fmt(i.closed_at)}</span>
              </p>
            )}
          </div>
        </div>

        {i.description && (
          <div className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded border border-slate-100">
            {i.description}
          </div>
        )}

        {i.tags && i.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="text-xs text-slate-400 font-semibold">TAGS:</span>
            {i.tags.map((t) => (
              <span key={t} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono">
                #{t}
              </span>
            ))}
          </div>
        )}

        {i.summary?.executive_summary && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded text-sm text-amber-900">
            <b className="block text-xs uppercase tracking-wider font-bold mb-1">Resumen Ejecutivo del Incidente:</b>
            {i.summary.executive_summary}
          </div>
        )}

        <div className="pt-2 border-t border-slate-100">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
            Flujo de Estado (Transiciones Permitidas):
          </span>
          <div className="flex gap-2 flex-wrap">
            {(NEXT[i.status] ?? []).map((s) => (
              <button
                key={s}
                disabled={m.isPending}
                onClick={() => m.mutate(s)}
                className="text-xs font-semibold border border-slate-300 rounded px-3 py-1.5 hover:bg-slate-100 transition-colors capitalize text-slate-700"
              >
                Mover a {s.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-bold text-slate-800 mb-3">Timeline de Actividad y Auditoría</h3>
        {!ev.data?.length ? (
          <p className="text-sm text-slate-500">Sin eventos registrados para este incidente.</p>
        ) : (
          <ol className="space-y-3 relative border-l-2 border-blue-400 ml-2 pl-4">
            {ev.data.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white"></span>
                <p className="text-sm font-semibold text-slate-800 capitalize">{e.event_type.replace(/_/g, " ")}</p>
                <p className="text-xs text-slate-400 mb-1">{fmt(e.created_at)}</p>
                {e.payload && Object.keys(e.payload).length > 0 && (
                  <pre className="text-xs bg-slate-50 border border-slate-100 p-2 rounded overflow-auto font-mono text-slate-700">
                    {JSON.stringify(e.payload, null, 2)}
                  </pre>
                )}
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
