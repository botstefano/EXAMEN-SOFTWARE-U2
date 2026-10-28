import { useState } from "react";
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
    try { setRes(await A.scan({ [mode]: val.trim(), channel })); }
    catch (err) { toast.error(errMsg(err, "Error al escanear")); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <PageHeader title="Escanear contenido" />
      <form onSubmit={go} className="bg-white p-4 rounded shadow space-y-3">
        <div className="flex gap-2">
          {["url", "text", "html"].map((m) => (
            <button type="button" key={m} onClick={() => setMode(m)} className={`px-3 py-1 rounded text-sm ${mode === m ? "bg-blue-600 text-white" : "bg-slate-100"}`}>{m.toUpperCase()}</button>
          ))}
          <Select className="ml-auto" value={channel} onChange={(e) => setChannel(e.target.value)}>
            {["email", "sms", "web", "qr", "vishing", "otro"].map((c) => <option key={c}>{c}</option>)}
          </Select>
        </div>
        {mode === "url" ? <Input placeholder="https://sospechoso.example/login" value={val} onChange={(e) => setVal(e.target.value)} />
          : <textarea rows={8} className="w-full border p-2 rounded font-mono text-sm" placeholder={mode === "html" ? "<html>…</html>" : "Texto del email/SMS…"} value={val} onChange={(e) => setVal(e.target.value)} />}
        <Btn disabled={loading}>{loading ? "Analizando…" : "Analizar"}</Btn>
      </form>
      {res && (
        <Card className="mt-4">
          <div className="flex items-center gap-3 mb-3"><h3 className="font-semibold">Veredicto</h3><Badge value={res.verdict} />
            <span className="text-sm">Confianza: {(res.confidence * 100).toFixed(1)}%</span></div>
          <h4 className="text-sm font-medium mb-1">Razones</h4>
          <ul className="list-disc ml-5 text-sm">{res.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
          {res.matched_indicators.length > 0 && <><h4 className="text-sm font-medium mt-3 mb-1">IOCs coincidentes</h4>
            <ul className="text-sm">{res.matched_indicators.map((m) => <li key={m.indicator_id}><code>{m.value}</code> ({m.type})</li>)}</ul></>}
          {res.llm && <p className="mt-3 text-sm bg-slate-50 p-2 rounded">LLM: {res.llm.summary}</p>}
          <details className="mt-3 text-sm"><summary className="cursor-pointer text-blue-600">Features técnicas</summary>
            <pre className="bg-slate-50 p-2 rounded overflow-auto text-xs">{JSON.stringify(res.features, null, 2)}</pre></details>
        </Card>
      )}
    </div>
  );
}
