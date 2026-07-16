import { Outlet, useNavigate } from "react-router-dom";
import { Save, Swords, ScrollText } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { AmbientEmbers } from "@/components/fantasy/AmbientEmbers";
import { FloatingActionOrb } from "@/components/fantasy/FloatingActionOrb";
import { FirstServerPrompt } from "@/components/onboarding/FirstServerPrompt";
import { serverApi } from "@/api";
import { useNotifications } from "@/hooks/useNotifications";

export function AppShell() {
  const navigate = useNavigate();
  const notifications = useNotifications();

  async function handleQuickSave() {
    await serverApi.saveWorld();
    notifications.success({ title: "World saved", message: "Your realm's fate has been etched into stone." });
  }

  return (
    <div className="relative min-h-screen bg-noise">
      <FirstServerPrompt />
      <AmbientEmbers />
      <Sidebar />
      <div className="relative z-10 pl-[76px] lg:pl-64">
        <TopBar />
        <main className="mx-auto max-w-[1600px] px-5 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
      <FloatingActionOrb
        actions={[
          { key: "save", label: "Save World", icon: <Save />, variant: "mana", onClick: handleQuickSave },
          {
            key: "control",
            label: "Server Control",
            icon: <Swords />,
            variant: "gold",
            onClick: () => navigate("/control"),
          },
          { key: "logs", label: "View Logs", icon: <ScrollText />, variant: "life", onClick: () => navigate("/logs") },
        ]}
      />
    </div>
  );
}
