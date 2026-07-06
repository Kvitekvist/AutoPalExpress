import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import Dashboard from "@/pages/Dashboard";
import Mods from "@/pages/Mods";
import ServerControl from "@/pages/ServerControl";
import WorldSettings from "@/pages/WorldSettings";
import Logs from "@/pages/Logs";
import Settings from "@/pages/Settings";
import SuperAdmin from "@/pages/SuperAdmin";
import { useAuth } from "@/hooks/useAuth";

function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user.role === "super_admin" ? <>{children}</> : <Navigate to="/" replace />;
}

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="players" element={<Navigate to="/" replace />} />
        <Route path="mods" element={<Mods />} />
        <Route path="control" element={<ServerControl />} />
        <Route path="world-settings" element={<WorldSettings />} />
        <Route path="logs" element={<Logs />} />
        <Route path="settings" element={<Settings />} />
        <Route
          path="super-admin"
          element={
            <RequireSuperAdmin>
              <SuperAdmin />
            </RequireSuperAdmin>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
