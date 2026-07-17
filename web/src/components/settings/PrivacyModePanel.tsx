import * as React from "react";
import { useTranslation } from "react-i18next";
import { EyeOff, Save } from "lucide-react";
import { systemSettingsApi } from "@/api";
import type { SystemSettings } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { EnchantedToggle } from "@/components/fantasy/EnchantedToggle";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { useNotifications } from "@/hooks/useNotifications";

/** Machine-wide toggle that masks IPs and folder paths across the app -
 * safe to stream/screen-share without leaking network or install info.
 * Shares the same persisted settings blob as SystemStartupPanel
 * (GET/POST /api/system-settings) but is its own focused panel since
 * "Windows Startup" and "Privacy Mode" are unrelated concerns. */
export function PrivacyModePanel() {
  const { t } = useTranslation();
  const [settings, setSettings] = React.useState<SystemSettings | null>(null);
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
        title: t("settings.privacy.savedTitle", { defaultValue: "Privacy Mode updated" }),
        message: saved.privacyMode
          ? t("settings.privacy.savedOnMessage", {
              defaultValue: "IPs and folder paths are now hidden throughout the app.",
            })
          : t("settings.privacy.savedOffMessage", { defaultValue: "Real IPs and folder paths are visible again." }),
      });
    } catch (e) {
      notifications.error({
        title: t("settings.privacy.failedTitle", { defaultValue: "Could not update Privacy Mode" }),
        message:
          e instanceof Error ? e.message : t("settings.privacy.unknownError", { defaultValue: "Unknown error." }),
      });
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <ScrollPanel icon={<EyeOff />} title={t("settings.privacy.title", { defaultValue: "Privacy Mode" })}>
        <p className="animate-pulse text-sm text-parchment-300/50">
          {t("settings.privacy.loading", { defaultValue: "Reading privacy settings..." })}
        </p>
      </ScrollPanel>
    );
  }

  return (
    <ScrollPanel icon={<EyeOff />} title={t("settings.privacy.title", { defaultValue: "Privacy Mode" })}>
      <div className="space-y-4">
        <p className="text-xs leading-relaxed text-parchment-300/50">
          {t("settings.privacy.description", {
            defaultValue:
              "Hides real IP addresses and folder paths across the app - safe to turn on before streaming or screen-sharing. Interactive folder pickers (deploy/import) still show real paths so you can confirm you picked the right one.",
          })}
        </p>
        <EnchantedToggle
          id="privacyMode"
          checked={settings.privacyMode}
          onCheckedChange={(privacyMode) => {
            setSettings((prev) => (prev ? { ...prev, privacyMode } : prev));
            setDirty(true);
          }}
          label={t("settings.privacy.toggleLabel", { defaultValue: "Mask IPs and folder paths" })}
          description={t("settings.privacy.toggleDescription", {
            defaultValue: "Applies immediately everywhere in the app for every user once saved, not just this browser.",
          })}
          disabled={saving}
        />
        <div className="flex justify-end">
          <RuneButton variant="gold" icon={<Save />} onClick={handleSave} disabled={!dirty || saving}>
            {saving
              ? t("settings.privacy.saving", { defaultValue: "Saving..." })
              : t("settings.privacy.save", { defaultValue: "Save Privacy Settings" })}
          </RuneButton>
        </div>
      </div>
    </ScrollPanel>
  );
}
