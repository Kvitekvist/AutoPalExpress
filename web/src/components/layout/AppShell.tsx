import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { AmbientEmbers } from "@/components/fantasy/AmbientEmbers";
import { FirstServerPrompt } from "@/components/onboarding/FirstServerPrompt";
import { UniversityQuestTracker } from "@/components/university/UniversityQuestTracker";

export function AppShell() {
  return (
    <div className="relative min-h-screen bg-noise">
      <FirstServerPrompt />
      <UniversityQuestTracker />
      <AmbientEmbers />
      <Sidebar />
      <div className="relative z-10 pl-[76px] lg:pl-64">
        <TopBar />
        <main className="mx-auto max-w-[1600px] px-5 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
