import * as React from "react";
import { Power, Save } from "lucide-react";
import { systemSettingsApi } from "@/api";
import type { SystemStartupSettings } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { EnchantedToggle } from "@/components/fantasy/EnchantedToggle";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { useNotifications } from "@/hooks/useNotifications";

export function SystemStartupPanel() {
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
        title: "Startup recovery saved",
        message: "AutoPalExpress will use these options the next time Windows or the app starts.",
      });
    } catch (e) {
      notifications.error({
        title: "Startup recovery failed",
        message: e instanceof Error ? e.message : "Unknown error.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <ScrollPanel icon={<Power />} title="Windows Startup">
        <p className="animate-pulse text-sm text-parchment-300/50">Reading startup recovery settings...</p>
      </ScrollPanel>
    );
  }

  return (
    <ScrollPanel icon={<Power />} title="Windows Startup">
      <div className="space-y-4">
        <EnchantedToggle
          id="bootWithWindows"
          checked={settings.bootWithWindows}
          onCheckedChange={(bootWithWindows) => update({ bootWithWindows })}
          label="Start AutoPalExpress with Windows"
          description="Opens the admin tool automatically when this Windows user signs in."
          disabled={saving}
        />
        <EnchantedToggle
          id="autoStartActiveServer"
          checked={settings.autoStartActiveServer}
          onCheckedChange={(autoStartActiveServer) => update({ autoStartActiveServer })}
          label="Restart the active server when AutoPalExpress opens"
          description="Useful after Windows updates or power loss: when the machine comes back, the app can bring the selected server back online."
          disabled={saving}
        />
        <div className="flex justify-end">
          <RuneButton variant="gold" icon={<Save />} onClick={handleSave} disabled={!dirty || saving}>
            {saving ? "Saving..." : "Save Startup Recovery"}
          </RuneButton>
        </div>
      </div>
    </ScrollPanel>
  );
}
