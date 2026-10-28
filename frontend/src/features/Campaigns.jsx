import { useState } from "react";
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
  const launch = useMutation({ mutationFn: A.launchCampaign, onSuccess: (r) => { toast.success(`Lanzada a ${r.launched} objetivos`); qc.invalidateQueries({ queryKey: ["campaigns"] }); }, onError: (e) => toast.error(errMsg(e)) });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function create(e) {
    e.preventDefault();
    try {
      const c = await A.createCampaign({ name: f.name, template: { subject: f.subject, body: f.body } });
      const emails = f.emails.split("\n").map((x) => x.trim()).filter(Boolean);
      if (emails.length) await A.importTargets(c.id, emails);
      toast.success("Campaña creada");
      setOpen(false); setF({ name: "", subject: "", body: "", emails: "" });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    } catch (err) { toast.error(errMsg(err)); }
  }
  const pct = (v) => `${((v ?? 0) * 100).toFixed(1)}%`;
  const cols = [
    { key: "name", header: "Nombre" }, { key: "status", header: "Estado" },
    { key: "click", header: "Click rate", render: (r) => pct(r.metrics?.click_rate) }, { key: "rep", header: "Report rate", render: (r) => pct(r.metrics?.report_rate) },
    { key: "a", header: "", render: (r) => <div className="flex gap-3">
      <button className="text-xs text-blue-600" onClick={async () => setMetrics({ name: r.name, ...(await A.campaignMetrics(r.id)) })}>Métricas</button>
      {["draft", "scheduled"].includes(r.status) && <button className="text-xs text-green-600" onClick={() => launch.mutate(r.id)}>Lanzar</button>}</div> },
  ];
  return (
    <div>
      <PageHeader title="Campañas de phishing simulado" actions={<Btn onClick={() => setOpen(true)}>+ Nueva</Btn>} />
      <DataTable columns={cols} rows={list.data} loading={list.isLoading} empty="Sin campañas" />
      {metrics && <Card className="mt-4"><h3 className="font-semibold mb-2">Métricas — {metrics.name}</h3>
        <div className="grid grid-cols-5 gap-3 text-center">{[["Enviados", metrics.sent], ["Clics", metrics.clicked], ["Reportados", metrics.reported], ["Click rate", pct(metrics.click_rate)], ["Report rate", pct(metrics.report_rate)]].map(([l, v]) => <div key={l}><p className="text-xs text-slate-500">{l}</p><p className="text-xl font-bold">{v}</p></div>)}</div></Card>}
      <Modal open={open} onClose={() => setOpen(false)} title="Nueva campaña">
        <form onSubmit={create} className="space-y-3"><Input required placeholder="Nombre" value={f.name} onChange={set("name")} />
          <Input required placeholder="Asunto del email" value={f.subject} onChange={set("subject")} />
          <textarea required rows={3} className="w-full border p-2 rounded text-sm" placeholder="Cuerpo del email" value={f.body} onChange={set("body")} />
          <textarea rows={4} className="w-full border p-2 rounded text-sm" placeholder="Emails de destino (uno por línea)" value={f.emails} onChange={set("emails")} />
          <Btn>Crear campaña</Btn></form></Modal>
    </div>
  );
}
