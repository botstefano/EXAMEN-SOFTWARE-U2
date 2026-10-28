import React, { useState } from "react";
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
    {
      key: "value",
      header: "Valor del IOC",
      render: (r) => (
        <button
          className="font-mono text-xs text-blue-600 hover:underline text-left break-all font-semibold"
          onClick={() => {
            setSel(r);
            setEnriched(null);
          }}
        >
          {r.value}
        </button>
      ),
    },
    {
      key: "type",
      header: "Tipo",
      render: (r) => <span className="uppercase text-xs font-semibold px-2 py-0.5 rounded bg-slate-100">{r.type}</span>,
    },
    {
      key: "is_active",
      header: "Estado",
      render: (r) => <Badge value={r.is_active ? "activo" : "inactivo"} />,
    },
    searching
      ? {
          key: "similarity",
          header: "Similitud Difusa",
          render: (r) => (
            <span className="font-semibold text-xs text-slate-700">
              {r.similarity ? `${(r.similarity * 100).toFixed(0)}%` : "Exacto"}
            </span>
          ),
        }
      : {
          key: "hit_count",
          header: "Apariciones (Hits)",
          render: (r) => <span className="font-bold text-sm text-slate-800">{r.hit_count}</span>,
        },
  ];

  async function enrich() {
    try {
      setEnriched(await A.enrich(sel.id));
      toast.success("Threat Intel enriquecido con éxito");
    } catch (e) {
      toast.error(errMsg(e, "Error al enriquecer"));
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Indicadores de Compromiso (IOCs)" />

      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
          Búsqueda de IOCs con coincidencia difusa (Trigram / Levenshtein)
        </label>
        <input
          className="w-full border border-slate-300 p-2.5 rounded text-sm focus:border-blue-500 outline-none"
          placeholder="Buscar dominio, URL, IP, hash, teléfono o email… (mín. 3 caracteres)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {searching && (
          <p className="text-xs text-blue-600 font-medium">Buscando indicadores similares a: &quot;{dq}&quot;...</p>
        )}
      </div>

      <DataTable columns={cols} rows={cur.data} loading={cur.isLoading} empty="Sin resultados para la búsqueda" />

      <Modal open={!!sel} onClose={() => setSel(null)} title="Detalle y Enriquecimiento de Amenaza">
        {sel && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-3 rounded border border-slate-200">
              <span className="text-xs font-bold uppercase text-slate-500 block mb-1">Valor Normalizado</span>
              <p className="font-mono text-sm break-all font-semibold text-slate-800">{sel.value}</p>
              <div className="mt-2 flex gap-2">
                <span className="text-xs bg-slate-200 px-2 py-0.5 rounded font-medium text-slate-700">Tipo: {sel.type}</span>
                <span className="text-xs bg-slate-200 px-2 py-0.5 rounded font-medium text-slate-700">
                  Estado: {sel.is_active ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">Integración con Threat Intelligence</span>
              <Btn onClick={enrich}>Enriquecer con Threat Intel</Btn>
            </div>

            {enriched && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Respuesta de Proveedores</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {enriched.providers.map((p, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded border text-xs space-y-1">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span className="uppercase">{p.provider}</span>
                        {p.score !== undefined && <span className="text-red-600">{p.score}% Malicioso</span>}
                      </div>
                      {p.hit_count !== undefined && <p>Total Hits Internos: {p.hit_count}</p>}
                      {p.stats && (
                        <div className="pt-1 text-slate-600">
                          <p>Maliciosos: {p.stats.malicious} motores</p>
                          <p>Inofensivos: {p.stats.harmless} motores</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <details className="text-xs">
                  <summary className="cursor-pointer text-blue-600">Ver JSON completo de Threat Intel</summary>
                  <pre className="mt-2 bg-slate-900 text-emerald-400 p-3 rounded overflow-auto font-mono text-[11px]">
                    {JSON.stringify(enriched, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
