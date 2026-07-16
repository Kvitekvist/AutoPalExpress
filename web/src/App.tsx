import * as React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import Dashboard from "@/pages/Dashboard";
import { useAuth } from "@/hooks/useAuth";

// Lazy-loaded so the initial bundle only ships Dashboard (the index route) -
// every other page becomes its own chunk, fetched on first navigation to it.
const Mods = React.lazy(() => import("@/pages/Mods"));
const ServerControl = React.lazy(() => import("@/pages/ServerControl"));
const WorldSettings = React.lazy(() => import("@/pages/WorldSettings"));
const LauncherFlags = React.lazy(() => import("@/pages/LauncherFlags"));
const Logs = React.lazy(() => import("@/pages/Logs"));
const Settings = React.lazy(() => import("@/pages/Settings"));
const SuperAdmin = React.lazy(() => import("@/pages/SuperAdmin"));
const ModWishlist = React.lazy(() => import("@/pages/ModWishlist"));

function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user.role === "super_admin" ? <>{children}</> : <Navigate to="/" replace />;
}

function PageFallback() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-600/30 border-t-gold-400" />
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="players" element={<Navigate to="/" replace />} />
        <Route
          path="mods"
          element={
            <React.Suspense fallback={<PageFallback />}>
              <Mods />
            </React.Suspense>
          }
        />
        <Route
          path="control"
          element={
            <React.Suspense fallback={<PageFallback />}>
              <ServerControl />
            </React.Suspense>
          }
        />
        <Route
          path="world-settings"
          element={
            <React.Suspense fallback={<PageFallback />}>
              <WorldSettings />
            </React.Suspense>
          }
        />
        <Route path="launcher-flags" element={<Navigate to="/launcher-options" replace />} />
        <Route
          path="launcher-options"
          element={
            <RequireSuperAdmin>
              <React.Suspense fallback={<PageFallback />}>
                <LauncherFlags />
              </React.Suspense>
            </RequireSuperAdmin>
          }
        />
        <Route
          path="logs"
          element={
            <React.Suspense fallback={<PageFallback />}>
              <Logs />
            </React.Suspense>
          }
        />
        <Route
          path="settings"
          element={
            <RequireSuperAdmin>
              <React.Suspense fallback={<PageFallback />}>
                <Settings />
              </React.Suspense>
            </RequireSuperAdmin>
          }
        />
        <Route
          path="super-admin"
          element={
            <RequireSuperAdmin>
              <React.Suspense fallback={<PageFallback />}>
                <SuperAdmin />
              </React.Suspense>
            </RequireSuperAdmin>
          }
        />
        <Route
          path="mod-wishlist"
          element={
            <RequireSuperAdmin>
              <React.Suspense fallback={<PageFallback />}>
                <ModWishlist />
              </React.Suspense>
            </RequireSuperAdmin>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
