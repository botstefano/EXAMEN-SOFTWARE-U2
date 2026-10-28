import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { A } from "../api/client";
import { Badge, Btn, Card, DataTable, Input, Modal, PageHeader, Spinner } from "../components/ui";
import { errMsg, toast } from "../stores/toastStore";

export function Users() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ email: "", full_name: "", password: "", role_codes: [] });
  const users = useQuery({ queryKey: ["users"], queryFn: A.users });
  const roles = useQuery({ queryKey: ["roles"], queryFn: A.roles });
  const toggle = useMutation({ mutationFn: (u) => A.updateUser(u.id, { is_active: !u.is_active }), onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }), onError: (e) => toast.error(errMsg(e)) });
  async function create(e) {
    e.preventDefault();
    try { await A.createUser(f); toast.success("Usuario creado"); setOpen(false); setF({ email: "", full_name: "", password: "", role_codes: [] }); qc.invalidateQueries({ queryKey: ["users"] }); }
    catch (err) { toast.error(errMsg(err)); }
  }
  const cols = [{ key: "email", header: "Email" }, { key: "full_name", header: "Nombre" }, { key: "roles", header: "Roles", render: (r) => r.roles.join(", ") },
    { key: "mfa", header: "MFA", render: (r) => (r.mfa_enabled ? "✓" : "✗") }, { key: "act", header: "Estado", render: (r) => <Badge value={r.is_active ? "activo" : "inactivo"} /> },
    { key: "a", header: "", render: (r) => <button className="text-xs text-blue-600" onClick={() => toggle.mutate(r)}>{r.is_active ? "Desactivar" : "Activar"}</button> }];
  return (
    <div>
      <PageHeader title="Usuarios" actions={<Btn onClick={() => setOpen(true)}>+ Nuevo</Btn>} />
      <DataTable columns={cols} rows={users.data} loading={users.isLoading} />
      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo usuario">
        <form onSubmit={create} className="space-y-3">
          <Input required type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <Input required placeholder="Nombre completo" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
          <Input required type="password" minLength={12} placeholder="Contraseña (mín. 12)" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          <div className="flex flex-wrap gap-3">{roles.data?.map((r) => <label key={r.code} className="text-sm flex gap-1 items-center">
            <input type="checkbox" checked={f.role_codes.includes(r.code)} onChange={(e) => setF({ ...f, role_codes: e.target.checked ? [...f.role_codes, r.code] : f.role_codes.filter((x) => x !== r.code) })} />{r.code}</label>)}</div>
          <Btn>Crear</Btn></form></Modal>
    </div>
  );
}

export function Roles() {
  const r = useQuery({ queryKey: ["roles"], queryFn: A.roles });
  return (<div><PageHeader title="Roles y permisos" />{r.isLoading ? <Spinner /> : <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
    {r.data?.map((x) => <Card key={x.code}><h3 className="font-semibold">{x.code}</h3><p className="text-sm text-slate-500">{x.description}</p>
      <div className="mt-2 flex flex-wrap gap-1">{x.permissions.map((p) => <span key={p} className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono">{p}</span>)}</div></Card>)}</div>}</div>);
}

export function Profile() {
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [mfa, setMfa] = useState(null);
  const [code, setCode] = useState("");
  async function pwd(e) {
    e.preventDefault();
    try { await A.changePassword(cur, nw); toast.success("Contraseña actualizada"); setCur(""); setNw(""); } catch (err) { toast.error(errMsg(err)); }
  }
  return (
    <div><PageHeader title="Mi cuenta" />
      <div className="grid md:grid-cols-2 gap-4">
        <Card><h3 className="font-semibold mb-3">Cambiar contraseña</h3>
          <form onSubmit={pwd} className="space-y-3"><Input required type="password" placeholder="Contraseña actual" value={cur} onChange={(e) => setCur(e.target.value)} />
            <Input required type="password" minLength={12} placeholder="Nueva (mín. 12 caracteres)" value={nw} onChange={(e) => setNw(e.target.value)} /><Btn>Actualizar</Btn></form></Card>
        <Card><h3 className="font-semibold mb-3">Autenticación MFA (TOTP)</h3>
          {!mfa ? <Btn onClick={async () => setMfa(await A.mfaSetup())}>Iniciar configuración</Btn> : <div className="space-y-3">
            <p className="text-sm">Añade este secreto en tu app autenticadora (Google Authenticator, Authy…):</p>
            <code className="block bg-slate-100 p-2 rounded text-xs break-all">{mfa.secret}</code>
            <Input maxLength={6} placeholder="Código de 6 dígitos" value={code} onChange={(e) => setCode(e.target.value)} />
            <Btn onClick={async () => { try { await A.mfaVerify(code); toast.success("MFA activado"); setMfa(null); } catch { toast.error("Código inválido"); } }}>Verificar y activar</Btn></div>}</Card>
      </div></div>
  );
}
