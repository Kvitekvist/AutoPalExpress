import * as React from "react";
import { useTranslation } from "react-i18next";
import { UploadCloud } from "lucide-react";
import type { Mod } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { InstallFromFileDialog } from "@/components/mods/InstallFromFileDialog";
import { ModWishlistPanel } from "@/components/settings/ModWishlistPanel";

export default function ModWishlist() {
  const { t } = useTranslation();
  const [installFromFileOpen, setInstallFromFileOpen] = React.useState(false);

  return (
    <div className="space-y-6">
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

      <ModWishlistPanel />

      <InstallFromFileDialog
        open={installFromFileOpen}
        onOpenChange={setInstallFromFileOpen}
        onInstalled={(_mods: Mod[]) => {}}
      />
    </div>
  );
}
