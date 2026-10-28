import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { A } from "../api/client";
import { Badge, Btn, Card, ConfirmDialog, Input, PageHeader, Select, Spinner } from "../components/ui";
import { errMsg, toast } from "../stores/toastStore";

export default function Rules() {
  const qc = useQueryClient();
  const lists = useQuery({ queryKey: ["rule-lists"], queryFn: A.ruleLists });
  const [sel, setSel] = useState(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("blacklist");
  const [entry, setEntry] = useState("");
  const [check, setCheck] = useState("");
  const [res, setRes] = useState(null);
  const [del, setDel] = useState(null);
  const entries = useQuery({ queryKey: ["rule-entries", sel], queryFn: () => A.ruleEntries(sel), enabled: !!sel });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["rule-entries", sel] }); qc.invalidateQueries({ queryKey: ["rule-lists"] }); };
  const addList = useMutation({ mutationFn: () => A.createRuleList(name, kind), onSuccess: () => { setName(""); refresh(); toast.success("Lista creada"); }, onError: (e) => toast.error(errMsg(e)) });
  const addEntry = useMutation({ mutationFn: () => A.addRuleEntry(sel, entry), onSuccess: () => { setEntry(""); refresh(); }, onError: (e) => toast.error(errMsg(e)) });
  const delEntry = useMutation({ mutationFn: (id) => A.delRuleEntry(id), onSuccess: () => { toast.success("Entrada eliminada"); refresh(); } });
  return (
    <div>
      <PageHeader title="Reglas y listas" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card><h3 className="font-semibold mb-2">Listas</h3>
          {lists.isLoading ? <Spinner /> : lists.data?.map((l) => (
            <button key={l.id} onClick={() => setSel(l.id)} className={`w-full text-left px-2 py-1 rounded ${sel === l.id ? "bg-blue-50" : "hover:bg-slate-50"}`}>
              <div className="flex justify-between text-sm"><span>{l.name}</span><Badge value={l.kind} /></div>
              <span className="text-xs text-slate-500">{l.entries_count} entradas</span></button>))}
          <div className="mt-4 border-t pt-3 space-y-2"><Input placeholder="Nombre de lista" value={name} onChange={(e) => setName(e.target.value)} />
            <Select className="w-full" value={kind} onChange={(e) => setKind(e.target.value)}><option>blacklist</option><option>whitelist</option></Select>
            <Btn className="w-full" disabled={!name} onClick={() => addList.mutate()}>Crear lista</Btn></div></Card>
        <Card className="lg:col-span-2"><h3 className="font-semibold mb-2">Entradas</h3>
          {!sel ? <p className="text-sm text-slate-500">Selecciona una lista</p> : <>
            <div className="flex gap-2 mb-3"><Input placeholder="Nuevo dominio / URL / IP…" value={entry} onChange={(e) => setEntry(e.target.value)} />
              <Btn disabled={!entry} onClick={() => addEntry.mutate()}>Añadir</Btn></div>
            <ul className="max-h-96 overflow-auto">{entries.data?.map((e) => (
              <li key={e.id} className="flex justify-between text-sm border-b py-1"><span className="font-mono break-all">{e.value}</span>
                <button className="text-red-600 text-xs" onClick={() => setDel(e.id)}>Eliminar</button></li>))}
              {!entries.data?.length && <li className="text-sm text-slate-500">Sin entradas</li>}</ul></>}</Card>
      </div>
      <Card className="mt-4"><h3 className="font-semibold mb-2">Consultar valor contra listas</h3>
        <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); setRes(await A.checkRule(check)); }}>
          <Input required placeholder="paypal-secure-login.example" value={check} onChange={(e) => setCheck(e.target.value)} /><Btn>Consultar</Btn></form>
        {res && <p className={`mt-3 font-medium ${res.matched ? "text-red-600" : "text-green-600"}`}>
          {res.matched ? `Coincide con «${res.list_name}» (${res.kind})` : "No coincide con ninguna lista"}</p>}</Card>
      <ConfirmDialog open={del !== null} message="¿Eliminar esta entrada? La acción queda auditada." onCancel={() => setDel(null)} onConfirm={() => { delEntry.mutate(del); setDel(null); }} />
    </div>
  );
}
