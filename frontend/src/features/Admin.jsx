import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { A } from "../api/client";
import { Btn, Card, DataTable, Input, PageHeader, Select, Spinner, download, fmt } from "../components/ui";
import { errMsg, toast } from "../stores/toastStore";

export function Etl() {
  const qc = useQueryClient();
  const [source, setSource] = useState("sample");
  const v = useQuery({ queryKey: ["versions"], queryFn: A.versions });
  const run = useMutation({ mutationFn: () => A.runEtl(source),
    onSuccess: (r) => { toast.success(`ETL OK: ${r.rows} filas, ${r.inserted} IOCs nuevos`); qc.invalidateQueries({ queryKey: ["versions"] }); },
    onError: (e) => toast.error(errMsg(e, "Error en ETL")) });
  const cols = [{ key: "source_name", header: "Fuente" }, { key: "row_count", header: "Filas" }, { key: "license", header: "Licencia" },
    { key: "ingested_at", header: "Ingesta", render: (r) => fmt(r.ingested_at) }, { key: "c", header: "Checksum", render: (r) => <code className="text-xs">{r.checksum_sha256.slice(0, 12)}…</code> }];
  return (
    <div>
      <PageHeader title="Datasets y ETL" />
      <Card className="mb-4"><h3 className="font-semibold mb-2">Ejecutar ingesta</h3>
        <div className="flex gap-2"><Select value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="sample">Muestra interna (offline)</option><option value="phishtank">PhishTank (internet)</option><option value="openphish">OpenPhish (internet)</option></Select>
          <Btn disabled={run.isPending} onClick={() => run.mutate()}>{run.isPending ? "Ejecutando…" : "Ejecutar"}</Btn></div></Card>
      <Card><h3 className="font-semibold mb-2">Versiones de dataset</h3><DataTable columns={cols} rows={v.data} loading={v.isLoading} /></Card>
    </div>
  );
}

export function Reports() {
  const [type, setType] = useState("weekly_kpis");
  const [format, setFormat] = useState("pdf");
  const [incident, setIncident] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const inc = useQuery({ queryKey: ["incidents-pick"], queryFn: () => A.incidents({ limit: 100 }), enabled: type === "incident_detail" });
  async function gen() {
    setLoading(true);
    try {
      const params = type === "incident_detail" ? { incident_id: incident } : type === "monthly_management" ? { month } : {};
      download(await A.report(type, format, params), `${type}.${format}`);
      toast.success("Reporte descargado");
    } catch (e) { toast.error("Error al generar el reporte (revisa los parámetros)"); } finally { setLoading(false); }
  }
  return (
    <div>
      <PageHeader title="Reportes" />
      <Card className="max-w-xl space-y-3">
        <Select className="w-full" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="weekly_kpis">KPIs semanales</option><option value="incident_detail">Detalle de incidente</option><option value="monthly_management">Gestión mensual</option></Select>
        <Select className="w-full" value={format} onChange={(e) => setFormat(e.target.value)}><option value="pdf">PDF</option><option value="docx">Word (.docx)</option><option value="xlsx">Excel (.xlsx)</option></Select>
        {type === "incident_detail" && <Select className="w-full" value={incident} onChange={(e) => setIncident(e.target.value)}><option value="">— Selecciona incidente —</option>{inc.data?.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}</Select>}
        {type === "monthly_management" && <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />}
        <Btn disabled={loading || (type === "incident_detail" && !incident)} onClick={gen}>{loading ? "Generando…" : "Descargar reporte"}</Btn></Card>
    </div>
  );
}

export function Compliance() {
  const [days, setDays] = useState(90);
  const s = useQuery({ queryKey: ["comp", days], queryFn: () => A.complianceSummary(days) });
  const sla = useQuery({ queryKey: ["sla", days], queryFn: () => A.sla(days) });
  async function exp() {
    try { download(new Blob([JSON.stringify(await A.auditExport(30), null, 2)], { type: "application/json" }), "auditoria.json"); }
    catch { toast.error("Error al exportar"); }
  }
  return (
    <div>
      <PageHeader title="Cumplimiento y evidencias" actions={<Btn onClick={exp}>Exportar auditoría (JSON)</Btn>} />
      <label className="text-sm mr-2">Periodo (días):</label><input type="number" min={7} max={365} className="border p-1 rounded w-20 text-sm mb-4" value={days} onChange={(e) => setDays(Number(e.target.value) || 90)} />
      {s.isLoading ? <Spinner /> : s.data && <>
        <Card className="mb-4"><h3 className="font-semibold mb-3">Métricas</h3><div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(s.data.metrics).map(([k, v]) => <div key={k} className="bg-slate-50 p-2 rounded"><p className="text-xs text-slate-500">{k.replace(/_/g, " ")}</p><p className="text-lg font-bold">{k.includes("rate") ? `${(v * 100).toFixed(1)}%` : v}</p></div>)}</div></Card>
        <Card className="mb-4"><h3 className="font-semibold mb-3">Controles</h3><div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          {Object.entries(s.data.controls).map(([k, v]) => <div key={k}><span className={v ? "text-green-600" : "text-red-600"}>{v ? "✓" : "✗"}</span> {k.replace(/_/g, " ")}</div>)}</div></Card></>}
      {sla.data && <Card><h3 className="font-semibold mb-2">SLA</h3><p className="text-sm">Incidentes: <b>{sla.data.incidents_in_period}</b> · Incumplidos: <b>{sla.data.sla_breached}</b> · Cumplimiento: <b>{(sla.data.sla_compliance_rate * 100).toFixed(1)}%</b></p></Card>}
    </div>
  );
}

export function AuditPage() {
  const [action, setAction] = useState("");
  const a = useQuery({ queryKey: ["audit", action], queryFn: () => A.audit({ action: action || undefined, limit: 200 }) });
  const cols = [{ key: "created_at", header: "Fecha", render: (r) => fmt(r.created_at) }, { key: "actor_email", header: "Actor" }, { key: "action", header: "Acción" }, { key: "resource", header: "Recurso" }, { key: "ip_address", header: "IP" }];
  return (<div><PageHeader title="Auditoría" /><Input className="max-w-xs mb-4" placeholder="Filtrar por acción exacta (auth.login…)" value={action} onChange={(e) => setAction(e.target.value)} />
    <DataTable columns={cols} rows={a.data} loading={a.isLoading} empty="Sin eventos" /></div>);
}
