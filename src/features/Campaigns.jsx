import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { A } from "../api/client";
import { Btn, Card, DataTable, Input, Modal, PageHeader } from "../components/ui";
import { errMsg, toast } from "../stores/toastStore";

export default function Campaigns() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", subject: "", body: "", emails: "" });
  const [metrics, setMetrics] = useState(null);

  const list = useQuery({ queryKey: ["campaigns"], queryFn: A.campaigns });

  const launch = useMutation({
    mutationFn: A.launchCampaign,
    onSuccess: (r) => {
      toast.success(`Campaña lanzada con éxito a ${r.launched} objetivos`);
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function create(e) {
    e.preventDefault();
    try {
      const c = await A.createCampaign({
        name: f.name,
        template: { subject: f.subject, body: f.body },
      });
      const emails = f.emails.split("\n").map((x) => x.trim()).filter(Boolean);
      if (emails.length) {
        await A.importTargets(c.id, emails);
      }
      toast.success("Campaña de simulación creada");
      setOpen(false);
      setF({ name: "", subject: "", body: "", emails: "" });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    } catch (err) {
      toast.error(errMsg(err));
    }
  }

  const pct = (v) => `${((v ?? 0) * 100).toFixed(1)}%`;

  const cols = [
    {
      key: "name",
      header: "Nombre de la Campaña",
      render: (r) => <span className="font-semibold text-slate-800">{r.name}</span>,
    },
    {
      key: "status",
      header: "Estado",
      render: (r) => (
        <span
          className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
            r.status === "completed"
              ? "bg-slate-100 text-slate-700"
              : r.status === "running"
              ? "bg-green-100 text-green-800"
              : "bg-blue-100 text-blue-800"
          }`}
        >
          {r.status}
        </span>
      ),
    },
    { key: "click", header: "Tasa de Clic", render: (r) => pct(r.metrics?.click_rate) },
    { key: "rep", header: "Tasa de Reporte", render: (r) => pct(r.metrics?.report_rate) },
    {
      key: "a",
      header: "Acciones",
      render: (r) => (
        <div className="flex gap-3 items-center">
          <button
            className="text-xs font-semibold text-blue-600 hover:underline"
            onClick={async () => setMetrics({ name: r.name, ...(await A.campaignMetrics(r.id)) })}
          >
            Ver Métricas
          </button>
          {["draft", "scheduled"].includes(r.status) && (
            <button
              className="text-xs font-semibold text-green-600 hover:text-green-800 hover:underline"
              onClick={() => launch.mutate(r.id)}
            >
              Lanzar Simulación
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campañas de Phishing Simulado y Concientización"
        actions={<Btn onClick={() => setOpen(true)}>+ Nueva Campaña</Btn>}
      />

      <DataTable columns={cols} rows={list.data} loading={list.isLoading} empty="Sin campañas registradas" />

      {metrics && (
        <Card className="border-l-4 border-l-blue-600">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 text-lg">Métricas Detalladas — {metrics.name}</h3>
            <button onClick={() => setMetrics(null)} className="text-xs text-slate-400 hover:text-slate-700">
              Cerrar
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
            {[
              ["Enviados", metrics.sent, "text-slate-800"],
              ["Clics Fraudulentos", metrics.clicked, "text-red-600"],
              ["Reportes a SOC", metrics.reported, "text-green-600"],
              ["Click Rate", pct(metrics.click_rate), "text-red-600"],
              ["Report Rate", pct(metrics.report_rate), "text-green-600"],
            ].map(([l, v, col]) => (
              <div key={l} className="bg-slate-50 p-3 rounded border border-slate-200">
                <p className="text-xs text-slate-500 font-medium mb-1">{l}</p>
                <p className={`text-2xl font-bold ${col}`}>{v}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Configurar Nueva Campaña de Phishing Simulado">
        <form onSubmit={create} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre de campaña</label>
            <Input
              required
              placeholder="Ej.: Concientización Q2 — Bono de productividad"
              value={f.name}
              onChange={set("name")}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Asunto del correo simulado</label>
            <Input
              required
              placeholder="Ej.: Actualización urgente de nómina / Verificación de cuenta"
              value={f.subject}
              onChange={set("subject")}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Cuerpo del correo electrónico</label>
            <textarea
              required
              rows={3}
              className="w-full border border-slate-300 p-2.5 rounded text-sm focus:border-blue-500 outline-none"
              placeholder="Estimado empleado: Haga clic en el siguiente enlace para verificar sus credenciales..."
              value={f.body}
              onChange={set("body")}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Lista de emails de destino (un correo por línea)
            </label>
            <textarea
              rows={4}
              className="w-full border border-slate-300 p-2.5 rounded text-sm font-mono focus:border-blue-500 outline-none"
              placeholder={"usuario1@phishguard.bank\nusuario2@phishguard.bank\nfinanzas@phishguard.bank"}
              value={f.emails}
              onChange={set("emails")}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 border rounded text-sm">
              Cancelar
            </button>
            <Btn>Crear Campaña</Btn>
          </div>
        </form>
      </Modal>
    </div>
  );
}
