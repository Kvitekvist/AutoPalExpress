import * as React from "react";
import { useTranslation } from "react-i18next";
import { HardDrive, UploadCloud } from "lucide-react";
import { instancesApi } from "@/api";
import type { ServerInstance, Mod } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { RemoteAccessPanel } from "@/components/settings/RemoteAccessPanel";
import { PortForwardPanel } from "@/components/settings/PortForwardPanel";
import { NexusIntegrationPanel } from "@/components/settings/NexusIntegrationPanel";
import { LocalApiSettingsPanel } from "@/components/settings/LocalApiSettingsPanel";
import { DiagnosticsPanel } from "@/components/settings/DiagnosticsPanel";
import { InstallFromFileDialog } from "@/components/mods/InstallFromFileDialog";
import { ModWishlistPanel } from "@/components/settings/ModWishlistPanel";
import { AncientTabs, AncientTabsContent, AncientTabsList, AncientTabsTrigger } from "@/components/fantasy/AncientTabs";

export default function SuperAdmin() {
  const { t } = useTranslation();
  const [instance, setInstance] = React.useState<ServerInstance | null>(null);
  const [installFromFileOpen, setInstallFromFileOpen] = React.useState(false);

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

      <AncientTabs defaultValue="host-controls">
        <AncientTabsList>
          <AncientTabsTrigger value="host-controls">{t("superAdmin.tabs.hostControls", { defaultValue: "Host Controls" })}</AncientTabsTrigger>
          <AncientTabsTrigger value="mod-wishlist">{t("superAdmin.tabs.modWishlist", { defaultValue: "Mod Wishlist" })}</AncientTabsTrigger>
        </AncientTabsList>

        <AncientTabsContent value="host-controls" className="space-y-6 pt-4">
      {instance && (
        <ScrollPanel icon={<HardDrive />} title={t("superAdmin.activeServer", { defaultValue: "Active Server" })}>
          <p className="truncate text-sm text-parchment-300/70">
            {instance.name} &middot; <span className="font-mono text-xs">{instance.serverPath}</span>
          </p>
        </ScrollPanel>
      )}

      <LocalApiSettingsPanel />
      <ScrollPanel icon={<UploadCloud />} title={t("superAdmin.modFileUploads", { defaultValue: "Mod File Uploads" })}>
        <p className="mb-4 text-xs leading-relaxed text-parchment-300/50">
          {t("superAdmin.modFileUploadsDescription", {
            defaultValue:
              "Install a mod from a file you already downloaded from Nexus. Uploaded files are placed on this machine's disk, so it's kept super-admin-only rather than something any invited admin can do - the exact-hash verification against Nexus's own catalog (see the dialog) is what makes this safe to allow at all.",
          })}
        </p>
        <RuneButton variant="gold" size="sm" icon={<UploadCloud />} onClick={() => setInstallFromFileOpen(true)}>
          {t("superAdmin.installFromFileButton", { defaultValue: "Install From File" })}
        </RuneButton>
      </ScrollPanel>

      <PortForwardPanel />
      <RemoteAccessPanel />
      <DiagnosticsPanel />
      <NexusIntegrationPanel />

        </AncientTabsContent>
        <AncientTabsContent value="mod-wishlist" className="pt-4">
          <ModWishlistPanel />
        </AncientTabsContent>
      </AncientTabs>

      <InstallFromFileDialog
        open={installFromFileOpen}
        onOpenChange={setInstallFromFileOpen}
        onInstalled={(_mods: Mod[]) => {}}
      />
    </div>
  );
}
