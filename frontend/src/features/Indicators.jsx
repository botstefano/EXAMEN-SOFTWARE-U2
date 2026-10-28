import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { A } from "../api/client";
import { Badge, Btn, DataTable, Modal, PageHeader } from "../components/ui";
import { useDebounce } from "../hooks/useDebounce";
import { errMsg, toast } from "../stores/toastStore";

export default function Indicators() {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null);
  const [enriched, setEnriched] = useState(null);
  const dq = useDebounce(q);
  const searching = dq.length >= 3;
  const s = useQuery({ queryKey: ["ind-search", dq], queryFn: () => A.searchInd(dq), enabled: searching });
  const a = useQuery({ queryKey: ["ind-active"], queryFn: () => A.activeInd(100), enabled: !searching });
  const cur = searching ? s : a;
  const cols = [
    { key: "value", header: "Valor", render: (r) => <button className="font-mono text-blue-600 text-left break-all" onClick={() => { setSel(r); setEnriched(null); }}>{r.value}</button> },
    { key: "type", header: "Tipo" },
    { key: "is_active", header: "Estado", render: (r) => <Badge value={r.is_active ? "activo" : "inactivo"} /> },
    searching ? { key: "similarity", header: "Similitud", render: (r) => r.similarity?.toFixed(2) } : { key: "hit_count", header: "Hits" },
  ];
  async function enrich() {
    try { setEnriched(await A.enrich(sel.id)); } catch (e) { toast.error(errMsg(e, "Error al enriquecer")); }
  }
  return (
    <div>
      <PageHeader title="Indicadores (IOCs)" />
      <input className="w-full border p-2 rounded mb-4" placeholder="Buscar dominio, URL, IP, hash… (búsqueda difusa, mín. 3 caracteres)" value={q} onChange={(e) => setQ(e.target.value)} />
      <DataTable columns={cols} rows={cur.data} loading={cur.isLoading} empty="Sin resultados" />
      <Modal open={!!sel} onClose={() => setSel(null)} title="Detalle del indicador">
        {sel && <div className="space-y-3"><p className="font-mono text-sm break-all">{sel.value}</p>
          <Btn onClick={enrich}>Enriquecer con Threat Intel</Btn>
          {enriched && <pre className="bg-slate-50 p-3 rounded text-xs overflow-auto">{JSON.stringify(enriched.providers, null, 2)}</pre>}</div>}
      </Modal>
    </div>
  );
}
