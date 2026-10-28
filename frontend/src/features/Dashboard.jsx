import { useQuery } from "@tanstack/react-query";
import { CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
    ["Phishing (30d)", d.phishing_total, "text-red-600"], ["Sospechosos", d.suspicious_total, "text-yellow-600"],
    ["Benignos", d.benign_total, "text-green-600"], ["Tasa FP", `${(d.fp_rate * 100).toFixed(1)}%`, "text-slate-700"],
    ["MTTR (min)", d.mttr_minutes, "text-blue-600"], ["SLA vencidos", d.sla_breaches, d.sla_breaches ? "text-red-600" : "text-green-600"],
  ];
  return (
    <div>
      <PageHeader title="Dashboard" />
      {k.isLoading ? <Spinner /> : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {items?.map(([l, v, col]) => <Card key={l}><p className="text-xs text-slate-500">{l}</p><p className={`text-2xl font-bold ${col}`}>{v}</p></Card>)}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <Card className="lg:col-span-2"><h3 className="font-semibold mb-2">Tendencia (30 días)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={t.data ?? []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip /><Legend />
              <Line type="monotone" dataKey="phishing" stroke="#dc2626" name="Phishing" /><Line type="monotone" dataKey="benign" stroke="#16a34a" name="Benigno" /></LineChart>
          </ResponsiveContainer></Card>
        <Card><h3 className="font-semibold mb-2">Canales (30d)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart><Pie data={c.data ?? []} dataKey="total" nameKey="channel" outerRadius={90} label>
              {(c.data ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart>
          </ResponsiveContainer></Card>
      </div>
      <Card className="mt-6"><h3 className="font-semibold mb-2">Top IOCs activos</h3>
        <DataTable loading={top.isLoading} rows={top.data} columns={[{ key: "domain", header: "Dominio / URL" }, { key: "hits", header: "Apariciones" }]} /></Card>
    </div>
  );
}
