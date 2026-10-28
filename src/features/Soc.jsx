import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { A } from "../api/client";
import { Badge, Btn, Card, DataTable, Input, PageHeader, Select, fmt } from "../components/ui";
import { errMsg, toast } from "../stores/toastStore";

export function ThreatHunting() {
  const [f, setF] = useState({ verdict: "phishing", channel: "", days: 30, url_like: "" });
  const [go, setGo] = useState(true);
  const [val, setVal] = useState("paypal-secure-login.example");
  const [corr, setCorr] = useState(null);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const r = useQuery({
    queryKey: ["hunt", f, go],
    enabled: go,
    queryFn: () =>
      A.hunt({
        verdict: f.verdict || undefined,
        channel: f.channel || undefined,
        since_days: Number(f.days) || 30,
        url_like: f.url_like || undefined,
      }),
  });

  const cols = [
    { key: "detected_at", header: "Fecha y Hora", render: (x) => fmt(x.detected_at) },
    { key: "verdict", header: "Veredicto", render: (x) => <Badge value={x.verdict} /> },
    { key: "channel", header: "Canal", render: (x) => <span className="uppercase text-xs font-semibold">{x.channel}</span> },
    {
      key: "confidence",
      header: "Confianza",
      render: (x) => <span className="font-semibold text-slate-800">{Math.round(x.confidence * 100)}%</span>,
    },
    {
      key: "url",
      header: "URL Analizada",
      render: (x) => <span className="font-mono text-xs break-all text-slate-700">{x.url ?? "—"}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Threat Hunting (Caza de Amenazas)" />

      <Card>
        <h3 className="font-bold text-slate-800 mb-3">Búsqueda Avanzada de Telemetría</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Veredicto</label>
            <Select className="w-full" value={f.verdict} onChange={set("verdict")}>
              <option value="">Cualquier veredicto</option>
              {["phishing", "sospechoso", "benigno"].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Canal</label>
            <Select className="w-full" value={f.channel} onChange={set("channel")}>
              <option value="">Cualquier canal</option>
              {["email", "sms", "web", "qr", "vishing"].map((v) => (
                <option key={v} value={v}>
                  {v.toUpperCase()}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Días atrás</label>
            <Input type="number" min={1} max={365} value={f.days} onChange={set("days")} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">URL contiene</label>
            <Input placeholder="Ej.: paypal, bbva…" value={f.url_like} onChange={set("url_like")} />
          </div>
        </div>
        <Btn
          onClick={() => {
            setGo(true);
            r.refetch();
          }}
        >
          Ejecutar Búsqueda
        </Btn>
      </Card>

      {go && (
        <Card>
          <h3 className="font-bold text-slate-800 mb-3">Eventos de Detección Encontrados</h3>
          <DataTable columns={cols} rows={r.data} loading={r.isLoading} empty="Sin resultados para estos filtros" />
        </Card>
      )}

      <Card>
        <h3 className="font-bold text-slate-800 mb-2">Correlación Cruzada de Indicadores</h3>
        <p className="text-xs text-slate-500 mb-3">
          Cruza un indicador o dominio en toda la base de datos de incidentes, telemetría e IOCs registrados.
        </p>
        <div className="flex gap-2 max-w-xl">
          <Input
            placeholder="Ej.: paypal-secure-login.example o bbva"
            value={val}
            onChange={(e) => setVal(e.target.value)}
          />
          <Btn
            disabled={val.length < 3}
            onClick={async () => {
              try {
                setCorr(await A.correlate(val));
                toast.success("Correlación completada");
              } catch (err) {
                toast.error(errMsg(err));
              }
            }}
          >
            Correlacionar
          </Btn>
        </div>

        {corr && (
          <div className="grid md:grid-cols-3 gap-4 mt-4 text-sm">
            <div className="bg-slate-50 p-4 rounded border border-slate-200">
              <b className="block text-slate-800 font-bold mb-2">Indicador</b>
              <p className="font-mono text-xs break-all text-blue-700 font-semibold">{corr.indicator.value}</p>
              <div className="mt-2 text-xs text-slate-600 space-y-1">
                <p>Estado: {corr.indicator.is_active ? "🟢 Activo en base" : "⚪ No registrado / inactivo"}</p>
                <p>Historial de hits: {corr.indicator.hit_count} detecciones</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded border border-slate-200">
              <b className="block text-slate-800 font-bold mb-2">Detecciones Relacionadas ({corr.detections.length})</b>
              {corr.detections.length ? (
                <ul className="max-h-48 overflow-auto space-y-1 text-xs">
                  {corr.detections.map((d) => (
                    <li key={d.id} className="border-b pb-1">
                      <span className="font-semibold">{d.verdict}</span> · {new Date(d.detected_at).toLocaleDateString()}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400">Sin detecciones previas</p>
              )}
            </div>

            <div className="bg-slate-50 p-4 rounded border border-slate-200">
              <b className="block text-slate-800 font-bold mb-2">Incidentes Asociados ({corr.incidents.length})</b>
              {corr.incidents.length ? (
                <ul className="space-y-1.5 text-xs">
                  {corr.incidents.map((i) => (
                    <li key={i.id} className="flex justify-between items-center gap-2">
                      <span className="truncate">{i.title}</span>
                      <Badge value={i.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400">Sin incidentes vinculados</p>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export function Assistant() {
  const [msgs, setMsgs] = useState([
    {
      role: "assistant",
      content:
        "Hola, soy tu asistente de operaciones SOC para PhishGuard Bank. Puedo responder tus dudas sobre playbooks de respuesta ante phishing, clones de BBVA/Santander, homograph attacks y políticas de retención de evidencias.",
      sources: [],
    },
  ]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(e) {
    e.preventDefault();
    const question = q.trim();
    if (!question) return;
    setQ("");
    setMsgs((m) => [...m, { role: "user", content: question }]);
    setLoading(true);
    try {
      const r = await A.rag(question);
      setMsgs((m) => [...m, { role: "assistant", content: r.answer, sources: r.sources }]);
    } catch (err) {
      toast.error(errMsg(err, "Error al consultar la base de conocimiento"));
    } finally {
      setLoading(false);
    }
  }

  const askPredefined = (questionText) => {
    setQ(questionText);
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <PageHeader title="Asistente de Operaciones SOC (RAG)" />

      <div className="flex gap-2 flex-wrap text-xs mb-2">
        <span className="text-slate-500 font-medium py-1">Consultas de playbook rápidas:</span>
        <button
          onClick={() => askPredefined("¿Qué hago ante un clon de BBVA?")}
          className="bg-white border border-slate-300 px-2.5 py-1 rounded hover:bg-slate-50 text-slate-700"
        >
          ¿Qué hago ante un clon de BBVA?
        </button>
        <button
          onClick={() => askPredefined("¿Cuál es el SLA de respuesta ante phishing crítico?")}
          className="bg-white border border-slate-300 px-2.5 py-1 rounded hover:bg-slate-50 text-slate-700"
        >
          ¿Cuál es el SLA de respuesta ante phishing crítico?
        </button>
        <button
          onClick={() => askPredefined("¿Cómo se analizan los homograph attacks?")}
          className="bg-white border border-slate-300 px-2.5 py-1 rounded hover:bg-slate-50 text-slate-700"
        >
          Homograph attacks
        </button>
        <button
          onClick={() => askPredefined("¿Cuál es la política de retención de datos?")}
          className="bg-white border border-slate-300 px-2.5 py-1 rounded hover:bg-slate-50 text-slate-700"
        >
          Política de retención
        </button>
      </div>

      <Card className="min-h-[420px] max-h-[65vh] overflow-y-auto space-y-4 p-5 bg-slate-50 border border-slate-200">
        <div className="space-y-3">
          {msgs.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[85%] p-3.5 rounded-lg text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-white text-slate-800 border border-slate-200 rounded-bl-none"
                }`}
              >
                {m.content}
              </div>
              {m.sources?.length > 0 && (
                <div className="text-[11px] text-slate-500 mt-1.5 px-1 bg-white/70 rounded p-1 border border-slate-200">
                  <span className="font-semibold text-slate-600">Fuentes consultadas:</span>{" "}
                  {m.sources.map((s) => `[Chunk #${s.chunk_id}] ${s.document}`).join(" · ")}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-white p-3 rounded border w-fit">
              <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Consultando playbooks y documentos SOC...</span>
            </div>
          )}
        </div>
      </Card>

      <form onSubmit={send} className="flex gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Escribe tu pregunta sobre incidentes, protocolos de remediación o SLAs…"
          disabled={loading}
        />
        <Btn disabled={loading || !q.trim()}>{loading ? "Procesando…" : "Enviar"}</Btn>
      </form>
    </div>
  );
}
