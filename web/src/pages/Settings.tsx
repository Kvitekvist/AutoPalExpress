import { InstanceManagerPanel } from "@/components/settings/InstanceManagerPanel";
import { UsersPanel } from "@/components/settings/UsersPanel";
import { AutomationPanel } from "@/components/settings/AutomationPanel";

export default function Settings() {
  return (
    <div className="space-y-6">
      <UsersPanel />
      <InstanceManagerPanel />
      <AutomationPanel />
    </div>
  );
}
