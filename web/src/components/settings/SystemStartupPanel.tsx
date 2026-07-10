import * as React from "react";
import { useTranslation } from "react-i18next";
import { Power, Save } from "lucide-react";
import { systemSettingsApi } from "@/api";
import type { SystemStartupSettings } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { EnchantedToggle } from "@/components/fantasy/EnchantedToggle";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { useNotifications } from "@/hooks/useNotifications";

export function SystemStartupPanel() {
  const { t } = useTranslation();
  const [settings, setSettings] = React.useState<SystemStartupSettings | null>(null);
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const notifications = useNotifications();

  React.useEffect(() => {
    systemSettingsApi.getSystemSettings().then(setSettings);
  }, []);

  function update(patch: Partial<SystemStartupSettings>) {
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
    setDirty(true);
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    try {
      const saved = await systemSettingsApi.updateSystemSettings(settings);
      setSettings(saved);
      setDirty(false);
      notifications.success({
        title: t("settings.startup.savedTitle", { defaultValue: "Startup recovery saved" }),
        message: t("settings.startup.savedMessage", { defaultValue: "AutoPalExpress will use these options the next time Windows or the app starts." }),
      });
    } catch (e) {
      notifications.error({
        title: t("settings.startup.failedTitle", { defaultValue: "Startup recovery failed" }),
        message: e instanceof Error ? e.message : t("settings.startup.unknownError", { defaultValue: "Unknown error." }),
      });
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <ScrollPanel icon={<Power />} title={t("settings.startup.title", { defaultValue: "Windows Startup" })}>
        <p className="animate-pulse text-sm text-parchment-300/50">
          {t("settings.startup.loading", { defaultValue: "Reading startup recovery settings..." })}
        </p>
      </ScrollPanel>
    );
  }

  return (
    <ScrollPanel icon={<Power />} title={t("settings.startup.title", { defaultValue: "Windows Startup" })}>
      <div className="space-y-4">
        <EnchantedToggle
          id="bootWithWindows"
          checked={settings.bootWithWindows}
          onCheckedChange={(bootWithWindows) => update({ bootWithWindows })}
          label={t("settings.startup.bootWithWindows", { defaultValue: "Start AutoPalExpress with Windows" })}
          description={t("settings.startup.bootWithWindowsDescription", { defaultValue: "Opens the admin tool automatically when this Windows user signs in." })}
          disabled={saving}
        />
        <EnchantedToggle
          id="autoStartActiveServer"
          checked={settings.autoStartActiveServer}
          onCheckedChange={(autoStartActiveServer) => update({ autoStartActiveServer })}
          label={t("settings.startup.autoStartServer", { defaultValue: "Restart the active server when AutoPalExpress opens" })}
          description={t("settings.startup.autoStartServerDescription", {
            defaultValue: "Useful after Windows updates or power loss: when the machine comes back, the app can bring the selected server back online.",
          })}
          disabled={saving}
        />
        <div className="flex justify-end">
          <RuneButton variant="gold" icon={<Save />} onClick={handleSave} disabled={!dirty || saving}>
            {saving ? t("settings.startup.saving", { defaultValue: "Saving..." }) : t("settings.startup.save", { defaultValue: "Save Startup Recovery" })}
          </RuneButton>
        </div>
      </div>
    </ScrollPanel>
  );
}
