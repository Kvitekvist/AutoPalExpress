import * as React from "react";
import { Rocket } from "lucide-react";
import { instancesApi } from "@/api";
import type { ServerInstance } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { EnchantedToggle } from "@/components/fantasy/EnchantedToggle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useNotifications } from "@/hooks/useNotifications";

export default function LauncherFlags() {
  const [instance, setInstance] = React.useState<ServerInstance | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const notifications = useNotifications();

  const load = React.useCallback(() => {
    setLoaded(false);
    instancesApi
      .getActive()
      .then(setInstance)
      .finally(() => setLoaded(true));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function saveCommunityServer(enabled: boolean) {
    if (!instance) return;
    setSaving(true);
    try {
      const next = await instancesApi.setCommunityServer(instance.id, enabled);
      setInstance(next.instances.find((item) => item.id === instance.id) ?? null);
      notifications.success({
        title: enabled ? "Community listing enabled" : "Community listing disabled",
        message: "Restart the server for this launcher flag to take effect.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function saveLaunchOptions(
    nextOptions: Partial<Pick<ServerInstance, "performanceFlags" | "workerThreads" | "jsonLogFormat">>
  ) {
    if (!instance) return;
    setSaving(true);
    try {
      const next = await instancesApi.setLaunchOptions(instance.id, {
        performanceFlags:
          "performanceFlags" in nextOptions ? Boolean(nextOptions.performanceFlags) : instance.performanceFlags,
        workerThreads: "workerThreads" in nextOptions ? nextOptions.workerThreads ?? null : instance.workerThreads,
        jsonLogFormat: "jsonLogFormat" in nextOptions ? Boolean(nextOptions.jsonLogFormat) : instance.jsonLogFormat,
      });
      setInstance(next.instances.find((item) => item.id === instance.id) ?? null);
      notifications.success({
        title: "Launcher flags saved",
        message: "Restart the server for these launcher flags to take effect.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <div className="flex h-64 items-center justify-center text-parchment-300/50">
        <p className="animate-pulse font-display">Loading launcher flags...</p>
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="flex h-64 items-center justify-center text-parchment-300/50">
        <p className="font-display">Select a server to edit launcher flags.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <ScrollPanel icon={<Rocket />} title="Launcher Flags">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <EnchantedToggle
            id="flag-community-server"
            checked={instance.communityServer}
            disabled={saving}
            onCheckedChange={saveCommunityServer}
            label="Show in Community Server list"
            description="Adds Palworld's public lobby launcher flag on next start."
          />
          <EnchantedToggle
            id="flag-performance"
            checked={instance.performanceFlags}
            disabled={saving}
            onCheckedChange={(checked) => saveLaunchOptions({ performanceFlags: checked })}
            label="Performance launch flags"
            description="Uses Palworld's multi-threaded server startup arguments."
          />
          <div className="rounded-md border border-stone-700 bg-abyss-900/40 px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <Label htmlFor="flag-worker-threads" className="normal-case text-sm font-medium text-parchment-100 tracking-normal">
                  Worker thread override
                </Label>
                <p className="mt-0.5 text-xs text-parchment-300/60">
                  Adds a specific process thread count when performance flags are on.
                </p>
              </div>
              <Switch
                id="flag-worker-threads-enabled"
                checked={instance.workerThreads !== null}
                disabled={!instance.performanceFlags || saving}
                onCheckedChange={(checked) =>
                  saveLaunchOptions({ workerThreads: checked ? instance.workerThreads ?? 4 : null })
                }
                aria-label="Use worker thread override"
              />
            </div>
            <Input
              key={`${instance.id}-${instance.workerThreads ?? "auto"}`}
              id="flag-worker-threads"
              className="mt-3 h-9 max-w-28 text-sm"
              type="number"
              min={1}
              max={128}
              defaultValue={instance.workerThreads ?? ""}
              disabled={!instance.performanceFlags || instance.workerThreads === null || saving}
              onBlur={(event) => {
                const value = Number.parseInt(event.target.value, 10);
                if (Number.isFinite(value)) {
                  const workerThreads = Math.min(128, Math.max(1, value));
                  if (workerThreads !== instance.workerThreads) {
                    saveLaunchOptions({ workerThreads });
                  }
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }}
            />
          </div>
          <EnchantedToggle
            id="flag-json-log-format"
            checked={instance.jsonLogFormat}
            disabled={saving}
            onCheckedChange={(checked) => saveLaunchOptions({ jsonLogFormat: checked })}
            label="JSON log format"
            description="Starts Palworld with structured JSON log output."
          />
        </div>
        <p className="mt-4 text-xs text-parchment-300/45">
          These flags apply to {instance.name} the next time it starts.
        </p>
      </ScrollPanel>
    </div>
  );
}
