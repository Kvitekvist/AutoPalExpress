import * as React from "react";
import { useTranslation } from "react-i18next";
import { HardDrive } from "lucide-react";
import { instancesApi } from "@/api";
import type { ServerInstance } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { RemoteAccessPanel } from "@/components/settings/RemoteAccessPanel";
import { PortForwardPanel } from "@/components/settings/PortForwardPanel";
import { NexusIntegrationPanel } from "@/components/settings/NexusIntegrationPanel";
import { LocalApiSettingsPanel } from "@/components/settings/LocalApiSettingsPanel";
import { DiagnosticsPanel } from "@/components/settings/DiagnosticsPanel";
import { RunSilentlyPanel } from "@/components/settings/RunSilentlyPanel";

export default function SuperAdmin() {
  const { t } = useTranslation();
  const [instance, setInstance] = React.useState<ServerInstance | null>(null);

  React.useEffect(() => {
    instancesApi.getActive().then(setInstance);
  }, []);

  return (
    <div className="space-y-6">
      <p className="text-xs leading-relaxed text-parchment-300/50">
        {t("superAdmin.intro", {
          defaultValue:
            "Anything here changes this machine's network exposure, who can reach it, or what external accounts it's connected to, and is reserved for the super admin, same as account management.",
        })}
      </p>

      {instance && (
        <ScrollPanel icon={<HardDrive />} title={t("superAdmin.activeServer", { defaultValue: "Active Server" })}>
          <p className="truncate text-sm text-parchment-300/70">
            {instance.name} &middot; <span className="font-mono text-xs">{instance.serverPath}</span>
          </p>
        </ScrollPanel>
      )}

      <LocalApiSettingsPanel />
      <PortForwardPanel />
      <RemoteAccessPanel />
      <DiagnosticsPanel />
      <NexusIntegrationPanel />
      <RunSilentlyPanel />
    </div>
  );
}
