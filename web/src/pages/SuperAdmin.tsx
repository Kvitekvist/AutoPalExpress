import * as React from "react";
import { HardDrive } from "lucide-react";
import { instancesApi } from "@/api";
import type { ServerInstance } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { RemoteAccessPanel } from "@/components/settings/RemoteAccessPanel";
import { PortForwardPanel } from "@/components/settings/PortForwardPanel";
import { NexusIntegrationPanel } from "@/components/settings/NexusIntegrationPanel";

export default function SuperAdmin() {
  const [instance, setInstance] = React.useState<ServerInstance | null>(null);

  React.useEffect(() => {
    instancesApi.getActive().then(setInstance);
  }, []);

  return (
    <div className="space-y-6">
      <p className="text-xs leading-relaxed text-parchment-300/50">
        Anything here changes this machine's network exposure, who can reach it, or what external accounts it's
        connected to, and is reserved for the super admin, same as account management.
      </p>

      {instance && (
        <ScrollPanel icon={<HardDrive />} title="Active Server">
          <p className="truncate text-sm text-parchment-300/70">
            {instance.name} &middot; <span className="font-mono text-xs">{instance.serverPath}</span>
          </p>
        </ScrollPanel>
      )}

      <PortForwardPanel />
      <RemoteAccessPanel />
      <NexusIntegrationPanel />
    </div>
  );
}
