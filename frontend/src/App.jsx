import { Navigate, Route, Routes } from "react-router-dom";
import Layout, { Perm, Protected } from "./components/Layout";
import Login from "./features/Login";
import Dashboard from "./features/Dashboard";
import Scan from "./features/Scan";
import { Incidents, IncidentDetail } from "./features/Incidents";
import Indicators from "./features/Indicators";
import Rules from "./features/Rules";
import { ThreatHunting, Assistant } from "./features/Soc";
import Campaigns from "./features/Campaigns";
import { Etl, Reports, Compliance, AuditPage } from "./features/Admin";
import { Users, Roles, Profile } from "./features/Users";

const P = (code, el) => <Perm code={code}>{el}</Perm>;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={P("dashboard:read", <Dashboard />)} />
        <Route path="/scan" element={P("detection:write", <Scan />)} />
        <Route path="/incidents" element={P("incident:read", <Incidents />)} />
        <Route path="/incidents/:id" element={P("incident:read", <IncidentDetail />)} />
        <Route path="/indicators" element={P("indicator:read", <Indicators />)} />
        <Route path="/rules" element={P("indicator:read", <Rules />)} />
        <Route path="/threat-hunting" element={P("detection:read", <ThreatHunting />)} />
        <Route path="/rag" element={P("soc:assistant", <Assistant />)} />
        <Route path="/campaigns" element={P("report:read", <Campaigns />)} />
        <Route path="/etl" element={P("etl:read", <Etl />)} />
        <Route path="/reports" element={P("report:generate", <Reports />)} />
        <Route path="/compliance" element={P("audit:read", <Compliance />)} />
        <Route path="/audit" element={P("audit:read", <AuditPage />)} />
        <Route path="/users" element={P("user:manage", <Users />)} />
        <Route path="/roles" element={P("role:manage", <Roles />)} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<div className="text-center py-20"><h1 className="text-5xl font-bold">404</h1><p className="text-slate-500 mt-2">Página no encontrada</p></div>} />
      </Route>
    </Routes>
  );
}
