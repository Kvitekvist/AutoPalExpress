import * as React from "react";
import { HardDrive, UploadCloud } from "lucide-react";
import { instancesApi } from "@/api";
import type { ServerInstance, Mod } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { RemoteAccessPanel } from "@/components/settings/RemoteAccessPanel";
import { PortForwardPanel } from "@/components/settings/PortForwardPanel";
import { NexusIntegrationPanel } from "@/components/settings/NexusIntegrationPanel";
import { InstallFromFileDialog } from "@/components/mods/InstallFromFileDialog";

export default function SuperAdmin() {
  const [instance, setInstance] = React.useState<ServerInstance | null>(null);
  const [installFromFileOpen, setInstallFromFileOpen] = React.useState(false);

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

      <ScrollPanel icon={<UploadCloud />} title="Mod File Uploads">
        <p className="mb-4 text-xs leading-relaxed text-parchment-300/50">
          Install a mod from a file you already downloaded, instead of Nexus's one-click install. Uploaded files are
          placed on this machine's disk, so it's kept super-admin-only rather than something any invited admin can do
          - the exact-hash verification against Nexus's own catalog (see the dialog) is what makes this safe to allow
          at all.
        </p>
        <RuneButton variant="gold" size="sm" icon={<UploadCloud />} onClick={() => setInstallFromFileOpen(true)}>
          Install From File
        </RuneButton>
      </ScrollPanel>

      <PortForwardPanel />
      <RemoteAccessPanel />
      <NexusIntegrationPanel />

      <InstallFromFileDialog
        open={installFromFileOpen}
        onOpenChange={setInstallFromFileOpen}
        onInstalled={(_mods: Mod[]) => {}}
      />
    </div>
  );
}
