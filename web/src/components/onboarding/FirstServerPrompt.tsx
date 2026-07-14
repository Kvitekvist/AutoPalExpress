import * as React from "react";
import { useTranslation } from "react-i18next";
import { Plus, FolderPlus } from "lucide-react";
import { instancesApi } from "@/api";
import { useAuth } from "@/hooks/useAuth";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { DeployServerWizard } from "@/components/settings/DeployServerWizard";
import { ImportServerDialog } from "@/components/settings/ImportServerDialog";

/**
 * Forces the super admin to create their first server (deploy new or import
 * existing) before using the rest of the app, instead of the installer
 * trying to deploy one itself (TICKET-0132) - reuses the same, already
 * reliable wizard/dialog Settings > Server Instances uses normally.
 */
export function FirstServerPrompt() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [instanceCount, setInstanceCount] = React.useState<number | null>(null);
  const [deployOpen, setDeployOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);

  React.useEffect(() => {
    if (user.role !== "super_admin") return;
    instancesApi.list().then((data) => setInstanceCount(data.instances.length));
  }, [user.role]);

  function handleCreated() {
    window.location.reload();
  }

  if (user.role !== "super_admin") return null;
  if (instanceCount === null || instanceCount > 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-abyss-950/95 p-6 backdrop-blur-sm">
      <div className="max-w-md space-y-5 rounded-lg border border-gold-600/40 bg-abyss-900 p-8 text-center shadow-xl">
        <h2 className="font-display text-xl font-semibold text-parchment-100">
          {t("onboarding.firstServer.title", { defaultValue: "Welcome to AutoPalExpress" })}
        </h2>
        <p className="text-sm leading-relaxed text-parchment-300/70">
          {t("onboarding.firstServer.description", {
            defaultValue: "Let's set up your first Palworld server before you get started - deploy a fresh one, or import a server you already have installed.",
          })}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <RuneButton type="button" variant="gold" icon={<Plus />} onClick={() => setDeployOpen(true)}>
            {t("settings.instances.deployNew", { defaultValue: "Deploy New Server" })}
          </RuneButton>
          <RuneButton type="button" variant="mana" icon={<FolderPlus />} onClick={() => setImportOpen(true)}>
            {t("settings.instances.importExisting", { defaultValue: "Import Existing" })}
          </RuneButton>
        </div>
      </div>

      <DeployServerWizard open={deployOpen} onOpenChange={setDeployOpen} onDeployed={handleCreated} />
      <ImportServerDialog open={importOpen} onOpenChange={setImportOpen} onImported={handleCreated} />
    </div>
  );
}
