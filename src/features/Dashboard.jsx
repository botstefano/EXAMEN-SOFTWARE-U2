import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { A } from "../api/client";
import { Card, DataTable, PageHeader, Spinner } from "../components/ui";

const COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6", "#6b7280"];

export default function Dashboard() {
  const k = useQuery({ queryKey: ["kpis"], queryFn: A.kpis, refetchInterval: 60000 });
  const t = useQuery({ queryKey: ["trends"], queryFn: () => A.trends(30) });
  const c = useQuery({ queryKey: ["channels"], queryFn: A.channels });
  const top = useQuery({ queryKey: ["top"], queryFn: () => A.top(15) });

  const d = k.data;
  const items = d && [
    ["Phishing (30d)", d.phishing_total, "text-red-600"],
    ["Sospechosos", d.suspicious_total, "text-yellow-600"],
    ["Benignos", d.benign_total, "text-green-600"],
    ["Tasa FP", `${(d.fp_rate * 100).toFixed(1)}%`, "text-slate-700"],
    ["MTTR (min)", d.mttr_minutes, "text-blue-600"],
    ["SLA vencidos", d.sla_breaches, d.sla_breaches ? "text-red-600" : "text-green-600"],
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard SOC Antifraude" />
      {k.isLoading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {items?.map(([l, v, col]) => (
            <Card key={l}>
              <p className="text-xs text-slate-500 font-medium">{l}</p>
              <p className={`text-2xl font-bold mt-1 ${col}`}>{v}</p>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <h3 className="font-semibold text-slate-800 mb-2">Tendencia de Detecciones (30 días)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={t.data ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="phishing" stroke="#dc2626" name="Phishing" strokeWidth={2} />
              <Line type="monotone" dataKey="benign" stroke="#16a34a" name="Benigno" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-800 mb-2">Canales de Ataque (30d)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={c.data ?? []}
                dataKey="total"
                nameKey="channel"
                outerRadius={85}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {(c.data ?? []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <h3 className="font-semibold text-slate-800 mb-2">Top IOCs Activos</h3>
        <DataTable
          loading={top.isLoading}
          rows={top.data}
          columns={[
            {
              key: "domain",
              header: "Dominio / URL",
              render: (r) => <span className="font-mono text-xs">{r.domain}</span>,
            },
            {
              key: "hits",
              header: "Apariciones",
              render: (r) => <span className="font-semibold">{r.hits}</span>,
            },
          ]}
        />
      </Card>
    </div>
  );
}
