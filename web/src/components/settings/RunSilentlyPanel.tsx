import * as React from "react";
import { useTranslation } from "react-i18next";
import { VenetianMask, Save } from "lucide-react";
import { systemSettingsApi } from "@/api";
import type { SystemStartupSettings } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { EnchantedToggle } from "@/components/fantasy/EnchantedToggle";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { useNotifications } from "@/hooks/useNotifications";

export function RunSilentlyPanel() {
  const { t } = useTranslation();
  const [settings, setSettings] = React.useState<SystemStartupSettings | null>(null);
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const notifications = useNotifications();

  React.useEffect(() => {
    systemSettingsApi.getSystemSettings().then(setSettings);
  }, []);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    try {
      const saved = await systemSettingsApi.updateSystemSettings(settings);
      setSettings(saved);
      setDirty(false);
      notifications.success({
        title: t("superAdmin.runSilently.savedTitle", { defaultValue: "Saved" }),
        message: t("superAdmin.runSilently.savedMessage", {
          defaultValue: "Takes effect the next time AutoPalExpress and the server start.",
        }),
      });
    } catch (e) {
      notifications.error({
        title: t("superAdmin.runSilently.failedTitle", { defaultValue: "Couldn't save" }),
        message: e instanceof Error ? e.message : t("superAdmin.runSilently.unknownError", { defaultValue: "Unknown error." }),
      });
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return null;

  return (
    <ScrollPanel icon={<VenetianMask />} title={t("superAdmin.runSilently.title", { defaultValue: "Run Silently" })}>
      <p className="mb-4 text-xs leading-relaxed text-parchment-300/50">
        {t("superAdmin.runSilently.description", {
          defaultValue:
            "Hides both the AutoPalExpress console window and the Palworld server's own console window. Off by default - turn this on if you'd rather have a clean desktop once you're done actively watching the console.",
        })}
      </p>
      <div className="space-y-4">
        <EnchantedToggle
          id="runSilently"
          checked={settings.runSilently}
          onCheckedChange={(runSilently) => {
            setSettings({ ...settings, runSilently });
            setDirty(true);
          }}
          label={t("superAdmin.runSilently.enableOrDisable", { defaultValue: "Enable or Disable" })}
          description={t("superAdmin.runSilently.hint", { defaultValue: "Takes effect on the next start, not live." })}
          disabled={saving}
        />
        <div className="flex justify-end">
          <RuneButton variant="gold" icon={<Save />} onClick={handleSave} disabled={!dirty || saving}>
            {saving ? t("superAdmin.runSilently.saving", { defaultValue: "Saving..." }) : t("superAdmin.runSilently.save", { defaultValue: "Save" })}
          </RuneButton>
        </div>
      </div>
    </ScrollPanel>
  );
}
