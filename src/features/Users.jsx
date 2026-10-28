import React, { useState } from "react";
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

  const toggle = useMutation({
    mutationFn: (u) => A.updateUser(u.id, { is_active: !u.is_active }),
    onSuccess: () => {
      toast.success("Estado de usuario actualizado");
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  async function create(e) {
    e.preventDefault();
    try {
      await A.createUser(f);
      toast.success("Usuario creado con éxito");
      setOpen(false);
      setF({ email: "", full_name: "", password: "", role_codes: [] });
      qc.invalidateQueries({ queryKey: ["users"] });
    } catch (err) {
      toast.error(errMsg(err));
    }
  }

  const cols = [
    { key: "email", header: "Email Institucional", render: (r) => <span className="font-semibold text-slate-800">{r.email}</span> },
    { key: "full_name", header: "Nombre Completo" },
    {
      key: "roles",
      header: "Roles",
      render: (r) => (
        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
          {r.roles.join(", ")}
        </span>
      ),
    },
    {
      key: "mfa",
      header: "MFA",
      render: (r) => (
        <span className={`font-bold ${r.mfa_enabled ? "text-green-600" : "text-slate-400"}`}>
          {r.mfa_enabled ? "✓ Activado" : "✗ Inactivo"}
        </span>
      ),
    },
    {
      key: "act",
      header: "Estado",
      render: (r) => <Badge value={r.is_active ? "activo" : "inactivo"} />,
    },
    {
      key: "a",
      header: "Acción",
      render: (r) => (
        <button
          className={`text-xs font-semibold hover:underline ${
            r.is_active ? "text-red-600" : "text-green-600"
          }`}
          onClick={() => toggle.mutate(r)}
        >
          {r.is_active ? "Desactivar" : "Activar"}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Administración de Usuarios del SOC" actions={<Btn onClick={() => setOpen(true)}>+ Nuevo Usuario</Btn>} />

      <DataTable columns={cols} rows={users.data} loading={users.isLoading} />

      <Modal open={open} onClose={() => setOpen(false)} title="Registrar Nuevo Usuario">
        <form onSubmit={create} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Email institucional</label>
            <Input
              required
              type="email"
              placeholder="nuevo.analista@phishguard.bank"
              value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre y apellidos</label>
            <Input
              required
              placeholder="Nombre Completo"
              value={f.full_name}
              onChange={(e) => setF({ ...f, full_name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Contraseña (mínimo 12 caracteres)</label>
            <Input
              required
              type="password"
              minLength={12}
              placeholder="••••••••••••"
              value={f.password}
              onChange={(e) => setF({ ...f, password: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Asignación de Roles</label>
            <div className="flex flex-wrap gap-4 bg-slate-50 p-3 rounded border">
              {roles.data?.map((r) => (
                <label key={r.code} className="text-sm flex gap-2 items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={f.role_codes.includes(r.code)}
                    onChange={(e) =>
                      setF({
                        ...f,
                        role_codes: e.target.checked
                          ? [...f.role_codes, r.code]
                          : f.role_codes.filter((x) => x !== r.code),
                      })
                    }
                  />
                  <span className="font-medium text-slate-800">{r.code}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 border rounded text-sm">
              Cancelar
            </button>
            <Btn>Crear Usuario</Btn>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function Roles() {
  const r = useQuery({ queryKey: ["roles"], queryFn: A.roles });

  return (
    <div className="space-y-4">
      <PageHeader title="Matriz de Roles y Permisos (RBAC)" />
      {r.isLoading ? (
        <Spinner />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {r.data?.map((x) => (
            <Card key={x.code} className="flex flex-col">
              <h3 className="font-bold text-slate-900 text-lg uppercase tracking-wider">{x.code}</h3>
              <p className="text-xs text-slate-500 mb-3">{x.description}</p>
              <div className="mt-auto pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                {x.permissions.map((p) => (
                  <span
                    key={p}
                    className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono border border-slate-200"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function Profile() {
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [mfa, setMfa] = useState(null);
  const [code, setCode] = useState("");

  async function pwd(e) {
    e.preventDefault();
    try {
      await A.changePassword(cur, nw);
      toast.success("Contraseña actualizada exitosamente");
      setCur("");
      setNw("");
    } catch (err) {
      toast.error(errMsg(err));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Mi Cuenta y Credenciales" />
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <Card>
          <h3 className="font-bold text-slate-800 mb-1">Cambiar Contraseña</h3>
          <p className="text-xs text-slate-500 mb-4">La política bancaria exige un mínimo de 12 caracteres.</p>
          <form onSubmit={pwd} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Contraseña actual</label>
              <Input
                required
                type="password"
                placeholder="Contraseña actual"
                value={cur}
                onChange={(e) => setCur(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nueva contraseña (12+ caracteres)</label>
              <Input
                required
                type="password"
                minLength={12}
                placeholder="Nueva contraseña segura"
                value={nw}
                onChange={(e) => setNw(e.target.value)}
              />
            </div>
            <Btn className="w-full">Actualizar Contraseña</Btn>
          </form>
        </Card>

        <Card>
          <h3 className="font-bold text-slate-800 mb-1">Autenticación Multifactor (TOTP MFA)</h3>
          <p className="text-xs text-slate-500 mb-4">
            Protege el acceso al SOC con Google Authenticator, Authy o Microsoft Authenticator.
          </p>
          {!mfa ? (
            <Btn onClick={async () => setMfa(await A.mfaSetup())}>Configurar Nuevo Autenticador TOTP</Btn>
          ) : (
            <div className="space-y-3 bg-slate-50 p-4 rounded border border-slate-200">
              <p className="text-xs text-slate-700">
                Añade esta clave secreta en tu aplicación autenticadora:
              </p>
              <code className="block bg-white p-2.5 rounded text-xs font-mono break-all border border-slate-300 text-blue-800 font-bold text-center">
                {mfa.secret}
              </code>
              <Input
                maxLength={6}
                placeholder="Código de 6 dígitos (000000)"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="text-center font-mono tracking-widest text-base"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMfa(null)}
                  className="px-3 py-1.5 border rounded text-xs text-slate-600"
                >
                  Cancelar
                </button>
                <Btn
                  className="flex-1"
                  onClick={async () => {
                    try {
                      await A.mfaVerify(code);
                      toast.success("Autenticación MFA activada exitosamente");
                      setMfa(null);
                      setCode("");
                    } catch {
                      toast.error("Código MFA inválido");
                    }
                  }}
                >
                  Verificar y Activar
                </Btn>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
