import { RemoteAccessPanel } from "@/components/settings/RemoteAccessPanel";
import { PortForwardPanel } from "@/components/settings/PortForwardPanel";
import { NexusIntegrationPanel } from "@/components/settings/NexusIntegrationPanel";

export default function SuperAdmin() {
  return (
    <div className="space-y-6">
      <p className="text-xs leading-relaxed text-parchment-300/50">
        Anything here changes this machine's network exposure, who can reach it, or what external accounts it's
        connected to, and is reserved for the super admin, same as account management.
      </p>
      <PortForwardPanel />
      <RemoteAccessPanel />
      <NexusIntegrationPanel />
    </div>
  );
}
