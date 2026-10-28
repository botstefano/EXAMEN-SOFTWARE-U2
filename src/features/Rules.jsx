import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { A } from "../api/client";
import { Badge, Btn, Card, ConfirmDialog, Input, PageHeader, Select, Spinner } from "../components/ui";
import { errMsg, toast } from "../stores/toastStore";

export default function Rules() {
  const qc = useQueryClient();
  const lists = useQuery({ queryKey: ["rule-lists"], queryFn: A.ruleLists });
  const [sel, setSel] = useState("rl-1");
  const [name, setName] = useState("");
  const [kind, setKind] = useState("blacklist");
  const [entry, setEntry] = useState("");
  const [check, setCheck] = useState("");
  const [res, setRes] = useState(null);
  const [del, setDel] = useState(null);

  const entries = useQuery({
    queryKey: ["rule-entries", sel],
    queryFn: () => A.ruleEntries(sel),
    enabled: !!sel,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["rule-entries", sel] });
    qc.invalidateQueries({ queryKey: ["rule-lists"] });
  };

  const addList = useMutation({
    mutationFn: () => A.createRuleList(name, kind),
    onSuccess: (newList) => {
      setName("");
      setSel(newList.id);
      refresh();
      toast.success("Lista creada con éxito");
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const addEntry = useMutation({
    mutationFn: () => A.addRuleEntry(sel, entry),
    onSuccess: () => {
      setEntry("");
      refresh();
      toast.success("Regla añadida con éxito");
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const delEntry = useMutation({
    mutationFn: (id) => A.delRuleEntry(id),
    onSuccess: () => {
      toast.success("Entrada eliminada de la lista");
      refresh();
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Reglas y Listas de Control de Acceso (Blacklist / Whitelist)" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <h3 className="font-bold text-slate-800 mb-3">Listas Configuradas</h3>
          {lists.isLoading ? (
            <Spinner />
          ) : (
            <div className="space-y-1.5">
              {lists.data?.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setSel(l.id)}
                  className={`w-full text-left p-2.5 rounded border transition-colors ${
                    sel === l.id
                      ? "bg-blue-50 border-blue-300 ring-1 ring-blue-300"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-slate-800">{l.name}</span>
                    <Badge value={l.kind} />
                  </div>
                  <span className="text-xs text-slate-500 mt-1 block">{l.entries_count} reglas activas</span>
                </button>
              ))}
            </div>
          )}

          <div className="mt-5 border-t border-slate-200 pt-4 space-y-3">
            <h4 className="text-xs font-bold uppercase text-slate-500">Crear Nueva Lista</h4>
            <Input placeholder="Nombre de lista…" value={name} onChange={(e) => setName(e.target.value)} />
            <Select className="w-full" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="blacklist">blacklist (Bloqueo automático)</option>
              <option value="whitelist">whitelist (Confianza permitida)</option>
            </Select>
            <Btn className="w-full" disabled={!name.trim()} onClick={() => addList.mutate()}>
              Crear Lista
            </Btn>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="font-bold text-slate-800 mb-3">Entradas de la Lista Seleccionada</h3>
          {!sel ? (
            <p className="text-sm text-slate-500">Selecciona una lista para gestionar sus entradas</p>
          ) : (
            <>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Nuevo dominio, URL o IP (ej.: atacante-seguro.example)…"
                  value={entry}
                  onChange={(e) => setEntry(e.target.value)}
                />
                <Btn disabled={!entry.trim()} onClick={() => addEntry.mutate()}>
                  Añadir Regla
                </Btn>
              </div>

              {entries.isLoading ? (
                <Spinner />
              ) : (
                <ul className="max-h-[420px] overflow-auto divide-y divide-slate-100 border rounded">
                  {entries.data?.map((e) => (
                    <li key={e.id} className="flex justify-between items-center p-2.5 text-sm hover:bg-slate-50">
                      <div>
                        <span className="font-mono text-xs font-semibold text-slate-800 break-all">{e.value}</span>
                        {e.reason && <p className="text-xs text-slate-400 mt-0.5">{e.reason}</p>}
                      </div>
                      <button
                        className="text-red-600 hover:text-red-800 text-xs font-semibold px-2 py-1 rounded hover:bg-red-50 transition-colors ml-2"
                        onClick={() => setDel(e.id)}
                      >
                        Eliminar
                      </button>
                    </li>
                  ))}
                  {!entries.data?.length && (
                    <li className="p-6 text-center text-sm text-slate-400">Esta lista no contiene entradas aún.</li>
                  )}
                </ul>
              )}
            </>
          )}
        </Card>
      </div>

      <Card>
        <h3 className="font-bold text-slate-800 mb-2">Comprobador Rápido de Reglas</h3>
        <p className="text-xs text-slate-500 mb-3">
          Verifica en tiempo real si un dominio o URL está sujeto a whitelist o blacklist en el motor.
        </p>
        <form
          className="flex gap-2 max-w-xl"
          onSubmit={async (e) => {
            e.preventDefault();
            setRes(await A.checkRule(check));
          }}
        >
          <Input
            required
            placeholder="Ej.: paypal-secure-login.example o banco.example"
            value={check}
            onChange={(e) => setCheck(e.target.value)}
          />
          <Btn>Comprobar</Btn>
        </form>

        {res && (
          <div
            className={`mt-4 p-3 rounded text-sm font-medium border ${
              res.matched
                ? res.kind === "blacklist"
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-green-50 border-green-200 text-green-800"
                : "bg-slate-50 border-slate-200 text-slate-700"
            }`}
          >
            {res.matched
              ? `✓ Coincide con lista «${res.list_name}» (${res.kind.toUpperCase()}) — Entrada: ${res.entry_value}`
              : "No coincide con ninguna lista activa (tráfico no filtrado por regla directa)"}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={del !== null}
        message="¿Estás seguro de que deseas eliminar esta entrada de la lista? La acción quedará registrada en el log de auditoría."
        onCancel={() => setDel(null)}
        onConfirm={() => {
          delEntry.mutate(del);
          setDel(null);
        }}
      />
    </div>
  );
}
