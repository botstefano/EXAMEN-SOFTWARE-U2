import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { A } from "../api/client";
import { Badge, Btn, Card, DataTable, Input, PageHeader, Select, fmt } from "../components/ui";
import { errMsg, toast } from "../stores/toastStore";

export function ThreatHunting() {
  const [f, setF] = useState({ verdict: "phishing", channel: "", days: 30, url_like: "" });
  const [go, setGo] = useState(false);
  const [val, setVal] = useState("");
  const [corr, setCorr] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const r = useQuery({ queryKey: ["hunt", f, go], enabled: go, queryFn: () => A.hunt({ verdict: f.verdict || undefined, channel: f.channel || undefined, since_days: f.days, url_like: f.url_like || undefined }) });
  const cols = [
    { key: "detected_at", header: "Fecha", render: (x) => fmt(x.detected_at) }, { key: "verdict", header: "Veredicto", render: (x) => <Badge value={x.verdict} /> },
    { key: "channel", header: "Canal" }, { key: "confidence", header: "Confianza", render: (x) => `${Math.round(x.confidence * 100)}%` },
    { key: "url", header: "URL", render: (x) => <span className="font-mono text-xs break-all">{x.url ?? "—"}</span> },
  ];
  return (
    <div>
      <PageHeader title="Threat Hunting" />
      <Card className="mb-4"><h3 className="font-semibold mb-2">Búsqueda avanzada</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
          <Select value={f.verdict} onChange={set("verdict")}><option value="">Cualquier veredicto</option>{["phishing", "sospechoso", "benigno"].map((v) => <option key={v}>{v}</option>)}</Select>
          <Select value={f.channel} onChange={set("channel")}><option value="">Cualquier canal</option>{["email", "sms", "web", "qr", "vishing"].map((v) => <option key={v}>{v}</option>)}</Select>
          <Input type="number" min={1} max={365} value={f.days} onChange={set("days")} />
          <Input placeholder="Contiene en URL…" value={f.url_like} onChange={set("url_like")} /></div>
        <Btn onClick={() => { setGo(true); r.refetch(); }}>Buscar</Btn></Card>
      {go && <DataTable columns={cols} rows={r.data} loading={r.isLoading} empty="Sin resultados" />}
      <Card className="mt-6"><h3 className="font-semibold mb-2">Correlación de indicador</h3>
        <div className="flex gap-2"><Input placeholder="paypal-secure-login.example" value={val} onChange={(e) => setVal(e.target.value)} />
          <Btn disabled={val.length < 3} onClick={async () => setCorr(await A.correlate(val))}>Correlacionar</Btn></div>
        {corr && <div className="grid md:grid-cols-3 gap-3 mt-3 text-sm">
          <div className="bg-slate-50 p-3 rounded"><b>Indicador</b><p className="break-all">{corr.indicator.value}</p><p>{corr.indicator.is_active ? "Activo" : "No registrado/inactivo"} · {corr.indicator.hit_count} hits</p></div>
          <div className="bg-slate-50 p-3 rounded"><b>Detecciones ({corr.detections.length})</b><ul className="max-h-40 overflow-auto">{corr.detections.map((d) => <li key={d.id}>{d.verdict} · {new Date(d.detected_at).toLocaleDateString()}</li>)}</ul></div>
          <div className="bg-slate-50 p-3 rounded"><b>Incidentes ({corr.incidents.length})</b><ul>{corr.incidents.map((i) => <li key={i.id}>{i.title} <Badge value={i.status} /></li>)}</ul></div></div>}</Card>
    </div>
  );
}

export function Assistant() {
  const [msgs, setMsgs] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  async function send(e) {
    e.preventDefault();
    const question = q.trim();
    if (!question) return;
    setQ("");
    setMsgs((m) => [...m, { role: "user", content: question }]);
    setLoading(true);
    try { const r = await A.rag(question); setMsgs((m) => [...m, { role: "assistant", content: r.answer, sources: r.sources }]); }
    catch (err) { toast.error(errMsg(err, "Error al consultar")); }
    finally { setLoading(false); }
  }
  return (
    <div>
      <PageHeader title="Asistente SOC" />
      <Card className="min-h-[360px] max-h-[60vh] overflow-auto mb-3">
        {!msgs.length && <p className="text-sm text-slate-500">Pregunta sobre playbooks, políticas o IOCs. Ej.: «¿Qué hago ante un clon de BBVA?»</p>}
        <div className="space-y-3">{msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : ""}>
            <div className={`inline-block max-w-[80%] p-3 rounded-lg whitespace-pre-wrap text-sm text-left ${m.role === "user" ? "bg-blue-600 text-white" : "bg-slate-100"}`}>{m.content}</div>
            {m.sources?.length > 0 && <div className="text-xs text-slate-500 mt-1">Fuentes: {m.sources.map((s) => `[${s.chunk_id}] ${s.document}`).join(" · ")}</div>}</div>))}</div>
      </Card>
      <form onSubmit={send} className="flex gap-2"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Escribe tu pregunta…" disabled={loading} /><Btn disabled={loading}>{loading ? "…" : "Enviar"}</Btn></form>
    </div>
  );
}
