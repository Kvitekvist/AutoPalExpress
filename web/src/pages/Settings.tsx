import { InstanceManagerPanel } from "@/components/settings/InstanceManagerPanel";
import { Ue4ssPanel } from "@/components/settings/Ue4ssPanel";
import { UsersPanel } from "@/components/settings/UsersPanel";
import { AutomationPanel } from "@/components/settings/AutomationPanel";
import { useAuth } from "@/hooks/useAuth";

export default function Settings() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {user.role === "super_admin" && <UsersPanel />}
      <InstanceManagerPanel />
      <Ue4ssPanel />
      <AutomationPanel />
    </div>
  );
}
