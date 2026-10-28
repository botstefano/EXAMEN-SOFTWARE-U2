import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { A } from "../api/client";
import { Btn, Card, DataTable, Input, PageHeader, Select, Spinner, download, fmt } from "../components/ui";
import { errMsg, toast } from "../stores/toastStore";

export function Etl() {
  const qc = useQueryClient();
  const [source, setSource] = useState("sample");
  const v = useQuery({ queryKey: ["versions"], queryFn: A.versions });

  const run = useMutation({
    mutationFn: () => A.runEtl(source),
    onSuccess: (r) => {
      toast.success(`ETL completado: ${r.rows} filas procesadas, ${r.inserted} IOCs nuevos`);
      qc.invalidateQueries({ queryKey: ["versions"] });
      qc.invalidateQueries({ queryKey: ["ind-active"] });
    },
    onError: (e) => toast.error(errMsg(e, "Error en ETL")),
  });

  const cols = [
    {
      key: "source_name",
      header: "Fuente",
      render: (r) => <span className="font-semibold uppercase text-xs text-slate-800">{r.source_name}</span>,
    },
    { key: "row_count", header: "Total Registros" },
    { key: "license", header: "Licencia / Términos", render: (r) => <span className="text-xs text-slate-600">{r.license}</span> },
    { key: "ingested_at", header: "Fecha Ingesta", render: (r) => fmt(r.ingested_at) },
    {
      key: "c",
      header: "Checksum SHA-256",
      render: (r) => <code className="text-xs text-slate-500 font-mono">{r.checksum_sha256.slice(0, 16)}…</code>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Datasets y Pipelines ETL de Inteligencia de Amenazas" />

      <Card>
        <h3 className="font-bold text-slate-800 mb-2">Ejecutar Ingesta Automatizada</h3>
        <p className="text-xs text-slate-500 mb-3">
          Ingesta feeds de IOCs y listas de phishing público para alimentar el motor heurístico en tiempo real.
        </p>
        <div className="flex gap-2 max-w-xl">
          <Select className="flex-1" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="sample">Muestra interna bancaria (offline - demo)</option>
            <option value="phishtank">PhishTank Feed (telemetría externa)</option>
            <option value="openphish">OpenPhish Community Feed</option>
          </Select>
          <Btn disabled={run.isPending} onClick={() => run.mutate()}>
            {run.isPending ? "Ejecutando Ingesta…" : "Ejecutar Pipeline"}
          </Btn>
        </div>
      </Card>

      <Card>
        <h3 className="font-bold text-slate-800 mb-3">Historial de Versiones de Dataset Ingeridas</h3>
        <DataTable columns={cols} rows={v.data} loading={v.isLoading} empty="Sin versiones de dataset registradas" />
      </Card>
    </div>
  );
}

export function Reports() {
  const [type, setType] = useState("weekly_kpis");
  const [format, setFormat] = useState("pdf");
  const [incident, setIncident] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);

  const inc = useQuery({
    queryKey: ["incidents-pick"],
    queryFn: () => A.incidents({ limit: 100 }),
    enabled: type === "incident_detail",
  });

  async function gen() {
    setLoading(true);
    try {
      const params = type === "incident_detail" ? { incident_id: incident } : type === "monthly_management" ? { month } : {};
      download(await A.report(type, format, params), `${type}.${format}`);
      toast.success("Reporte generado y descargado correctamente");
    } catch {
      toast.error("Error al generar el reporte (revisa los parámetros seleccionados)");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Generación y Descarga de Reportes" />

      <Card className="max-w-xl space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de informe</label>
          <Select className="w-full" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="weekly_kpis">KPIs Semanales Antifraude</option>
            <option value="incident_detail">Detalle Técnico de Incidente</option>
            <option value="monthly_management">Gestión Mensual y SLAs</option>
          </Select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Formato de salida</label>
          <Select className="w-full" value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="pdf">Documento PDF (.pdf)</option>
            <option value="docx">Microsoft Word (.docx)</option>
            <option value="xlsx">Microsoft Excel (.xlsx)</option>
          </Select>
        </div>

        {type === "incident_detail" && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Incidente a reportar</label>
            <Select className="w-full" value={incident} onChange={(e) => setIncident(e.target.value)}>
              <option value="">— Selecciona un incidente —</option>
              {inc.data?.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.title} ({i.status})
                </option>
              ))}
            </Select>
          </div>
        )}

        {type === "monthly_management" && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Mes de reporte</label>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
        )}

        <Btn
          className="w-full"
          disabled={loading || (type === "incident_detail" && !incident)}
          onClick={gen}
        >
          {loading ? "Generando Reporte Oficial…" : "Descargar Reporte"}
        </Btn>
      </Card>
    </div>
  );
}

export function Compliance() {
  const [days, setDays] = useState(90);
  const s = useQuery({ queryKey: ["comp", days], queryFn: () => A.complianceSummary(days) });
  const sla = useQuery({ queryKey: ["sla", days], queryFn: () => A.sla(days) });

  async function exp() {
    try {
      download(
        new Blob([JSON.stringify(await A.auditExport(30), null, 2)], { type: "application/json" }),
        "auditoria-phishguard.json"
      );
      toast.success("Archivo de auditoría exportado en JSON");
    } catch {
      toast.error("Error al exportar los logs de auditoría");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cumplimiento Normativo y Evidencias Regulatorias"
        actions={<Btn onClick={exp}>Exportar Auditoría (JSON)</Btn>}
      />

      <div className="flex items-center gap-2">
        <label className="text-sm font-semibold text-slate-600">Periodo de evaluación:</label>
        <input
          type="number"
          min={7}
          max={365}
          className="border border-slate-300 p-1.5 rounded w-24 text-sm outline-none focus:border-blue-500"
          value={days}
          onChange={(e) => setDays(Number(e.target.value) || 90)}
        />
        <span className="text-sm text-slate-500">días</span>
      </div>

      {s.isLoading ? (
        <Spinner />
      ) : (
        s.data && (
          <>
            <Card>
              <h3 className="font-bold text-slate-800 mb-3">Métricas de Seguridad del Periodo</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(s.data.metrics).map(([k, v]) => (
                  <div key={k} className="bg-slate-50 p-3 rounded border border-slate-200">
                    <p className="text-xs text-slate-500 capitalize font-medium">{k.replace(/_/g, " ")}</p>
                    <p className="text-xl font-bold text-slate-800 mt-1">
                      {k.includes("rate") ? `${(v * 100).toFixed(1)}%` : v}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="font-bold text-slate-800 mb-3">Controles de Cumplimiento Regulatorio</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                {Object.entries(s.data.controls).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 p-2 rounded bg-slate-50 border border-slate-100">
                    <span className={`font-bold text-base ${v ? "text-green-600" : "text-red-600"}`}>
                      {v ? "✓" : "✗"}
                    </span>
                    <span className="text-slate-700 capitalize font-medium">{k.replace(/_/g, " ")}</span>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )
      )}

      {sla.data && (
        <Card>
          <h3 className="font-bold text-slate-800 mb-2">Cumplimiento de Service Level Agreement (SLA)</h3>
          <p className="text-sm text-slate-700">
            Total de incidentes en el periodo: <b>{sla.data.incidents_in_period}</b> · SLA incumplidos:{" "}
            <b className="text-red-600">{sla.data.sla_breached}</b> · Tasa de cumplimiento SLA:{" "}
            <b className="text-green-600">{(sla.data.sla_compliance_rate * 100).toFixed(1)}%</b>
          </p>
        </Card>
      )}
    </div>
  );
}

export function AuditPage() {
  const [action, setAction] = useState("");
  const a = useQuery({
    queryKey: ["audit", action],
    queryFn: () => A.audit({ action: action || undefined, limit: 200 }),
  });

  const cols = [
    { key: "created_at", header: "Fecha y Hora", render: (r) => fmt(r.created_at) },
    { key: "actor_email", header: "Usuario / Actor", render: (r) => <span className="font-medium">{r.actor_email}</span> },
    {
      key: "action",
      header: "Acción",
      render: (r) => <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono text-blue-700">{r.action}</code>,
    },
    { key: "resource", header: "Recurso", render: (r) => <span className="text-xs uppercase font-semibold">{r.resource}</span> },
    { key: "ip_address", header: "Dirección IP", render: (r) => <code className="text-xs">{r.ip_address}</code> },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Pista de Auditoría Append-Only" />
      <Input
        className="max-w-xs mb-4"
        placeholder="Filtrar por acción (auth.login, incident.update…)"
        value={action}
        onChange={(e) => setAction(e.target.value)}
      />
      <DataTable columns={cols} rows={a.data} loading={a.isLoading} empty="Sin eventos de auditoría registrados" />
    </div>
  );
}
