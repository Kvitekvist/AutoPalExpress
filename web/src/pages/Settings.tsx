import { InstanceManagerPanel } from "@/components/settings/InstanceManagerPanel";
import { UsersPanel } from "@/components/settings/UsersPanel";
import { AutomationPanel } from "@/components/settings/AutomationPanel";
import { SystemStartupPanel } from "@/components/settings/SystemStartupPanel";

export default function Settings() {
  return (
    <div className="space-y-6">
      <SystemStartupPanel />
      <UsersPanel />
      <InstanceManagerPanel />
      <AutomationPanel />
    </div>
  );
}
