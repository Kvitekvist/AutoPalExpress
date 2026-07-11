import * as React from "react";
import { useTranslation } from "react-i18next";
import { Rocket, Save } from "lucide-react";
import { instancesApi, networkApi } from "@/api";
import type { ServerInstance, UpnpStatus } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { EnchantedToggle } from "@/components/fantasy/EnchantedToggle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { useNotifications } from "@/hooks/useNotifications";

export default function LauncherFlags() {
  const { t } = useTranslation();
  const [instance, setInstance] = React.useState<ServerInstance | null>(null);
  const [networkStatus, setNetworkStatus] = React.useState<UpnpStatus | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [queryPort, setQueryPort] = React.useState<number | null>(null);
  const [savingQueryPort, setSavingQueryPort] = React.useState(false);
  const notifications = useNotifications();

  const load = React.useCallback(() => {
    setLoaded(false);
    Promise.all([instancesApi.getActive(), networkApi.getUpnpStatus().catch(() => null)])
      .then(([active, status]) => {
        setInstance(active);
        setNetworkStatus(status);
        setQueryPort(active?.queryPort ?? null);
      })
      .finally(() => setLoaded(true));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function saveLaunchOptions(
    nextOptions: Partial<
      Pick<
        ServerInstance,
        | "usePerfThreads"
        | "noAsyncLoadingThread"
        | "useMultithreadForDs"
        | "communityServer"
        | "usePublicIpOverride"
        | "usePublicPortOverride"
      >
    >
  ) {
    if (!instance) return;
    setSaving(true);
    try {
      const next = await instancesApi.setLaunchOptions(instance.id, {
        usePerfThreads: "usePerfThreads" in nextOptions ? Boolean(nextOptions.usePerfThreads) : instance.usePerfThreads,
        noAsyncLoadingThread:
          "noAsyncLoadingThread" in nextOptions
            ? Boolean(nextOptions.noAsyncLoadingThread)
            : instance.noAsyncLoadingThread,
        useMultithreadForDs:
          "useMultithreadForDs" in nextOptions
            ? Boolean(nextOptions.useMultithreadForDs)
            : instance.useMultithreadForDs,
        publicLobby: "communityServer" in nextOptions ? Boolean(nextOptions.communityServer) : instance.communityServer,
        usePublicIpOverride:
          "usePublicIpOverride" in nextOptions
            ? Boolean(nextOptions.usePublicIpOverride)
            : instance.usePublicIpOverride,
        usePublicPortOverride:
          "usePublicPortOverride" in nextOptions
            ? Boolean(nextOptions.usePublicPortOverride)
            : instance.usePublicPortOverride,
      });
      setInstance(next.instances.find((item) => item.id === instance.id) ?? null);
      notifications.success({
        title: t("launcherOptions.savedTitle", { defaultValue: "Launcher options saved" }),
        message: t("launcherOptions.savedMessage", { defaultValue: "Restart the server for these launcher options to take effect." }),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveQueryPort() {
    if (!instance || !queryPort) return;
    setSavingQueryPort(true);
    try {
      const next = await instancesApi.setQueryPort(instance.id, queryPort);
      setInstance(next.instances.find((item) => item.id === instance.id) ?? null);
      notifications.success({
        title: t("launcherOptions.queryPortSavedTitle", { defaultValue: "Steam query port saved" }),
        message: t("launcherOptions.queryPortSavedMessage", { defaultValue: "Restart the server for this to take effect." }),
      });
    } finally {
      setSavingQueryPort(false);
    }
  }

  function handleQueryPortChange(value: string) {
    const parsed = parseInt(value, 10);
    setQueryPort(Number.isNaN(parsed) ? null : parsed);
  }

  const queryPortDirty = !!instance && queryPort !== null && queryPort !== instance.queryPort;
  const publicIp = networkStatus?.externalIp ?? "";
  const publicPort = networkStatus?.port ?? instance?.effectiveGamePort ?? instance?.gamePort ?? "";
  const unavailable = t("launcherOptions.unavailable", { defaultValue: "Unavailable" });

  if (!loaded) {
    return (
      <div className="flex h-64 items-center justify-center text-parchment-300/50">
        <p className="animate-pulse font-display">{t("launcherOptions.loading", { defaultValue: "Loading launcher options..." })}</p>
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="flex h-64 items-center justify-center text-parchment-300/50">
        <p className="font-display">{t("launcherOptions.selectServer", { defaultValue: "Select a server to edit launcher options." })}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <ScrollPanel icon={<Rocket />} title={t("launcherOptions.title", { defaultValue: "Launcher Options" })}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <EnchantedToggle
            id="flag-community-server"
            checked={instance.communityServer}
            disabled={saving}
            onCheckedChange={(checked) => saveLaunchOptions({ communityServer: checked })}
            label="-publiclobby"
            description={t("launcherOptions.publicLobby", { defaultValue: "Shows the server in Palworld's Community Server list." })}
          />
          <EnchantedToggle
            id="flag-useperfthreads"
            checked={instance.usePerfThreads}
            disabled={saving}
            onCheckedChange={(checked) => saveLaunchOptions({ usePerfThreads: checked })}
            label="-useperfthreads"
            description={t("launcherOptions.perfThreads", { defaultValue: "Enables Palworld's performance-thread launcher path." })}
          />
          <EnchantedToggle
            id="flag-no-async-loading-thread"
            checked={instance.noAsyncLoadingThread}
            disabled={saving}
            onCheckedChange={(checked) => saveLaunchOptions({ noAsyncLoadingThread: checked })}
            label="-NoAsyncLoadingThread"
            description={t("launcherOptions.noAsyncLoadingThread", { defaultValue: "Disables Palworld's separate async loading thread." })}
          />
          <EnchantedToggle
            id="flag-use-multithread-for-ds"
            checked={instance.useMultithreadForDs}
            disabled={saving}
            onCheckedChange={(checked) => saveLaunchOptions({ useMultithreadForDs: checked })}
            label="-UseMultithreadForDS"
            description={t("launcherOptions.multithreadForDs", { defaultValue: "Uses Palworld's dedicated-server multithreading flag." })}
          />
          <div className="space-y-3 rounded-md border border-stone-700 bg-abyss-950/40 p-4">
            <EnchantedToggle
              id="flag-public-ip"
              checked={instance.usePublicIpOverride}
              disabled={saving}
              onCheckedChange={(checked) => saveLaunchOptions({ usePublicIpOverride: checked })}
              label="-publicip"
              description={t("launcherOptions.publicIpDescription", { defaultValue: "Advertises the public IP detected by Super Admin." })}
              className="border-0 bg-transparent p-0"
            />
            <div className={instance.usePublicIpOverride ? "opacity-60" : "opacity-35"}>
              <Label htmlFor="flag-public-ip-value" className="text-[11px]">
                {t("launcherOptions.superAdminPublicIp", { defaultValue: "Super Admin public IP" })}
              </Label>
              <Input
                id="flag-public-ip-value"
                value={publicIp || unavailable}
                disabled
                className="mt-1 font-mono"
              />
            </div>
          </div>
          <div className="space-y-3 rounded-md border border-stone-700 bg-abyss-950/40 p-4">
            <EnchantedToggle
              id="flag-public-port"
              checked={instance.usePublicPortOverride}
              disabled={saving}
              onCheckedChange={(checked) => saveLaunchOptions({ usePublicPortOverride: checked })}
              label="-publicport"
              description={t("launcherOptions.publicPortDescription", { defaultValue: "Advertises the game port from Super Admin." })}
              className="border-0 bg-transparent p-0"
            />
            <div className={instance.usePublicPortOverride ? "opacity-60" : "opacity-35"}>
              <Label htmlFor="flag-public-port-value" className="text-[11px]">
                {t("launcherOptions.superAdminGamePort", { defaultValue: "Super Admin game port" })}
              </Label>
              <Input
                id="flag-public-port-value"
                value={publicPort ? String(publicPort) : unavailable}
                disabled
                className="mt-1 font-mono"
              />
            </div>
          </div>
          <div className="space-y-1.5 rounded-md border border-stone-700 bg-abyss-950/40 p-4">
            <Label htmlFor="flag-query-port">-queryport</Label>
            <p className="text-[11px] leading-relaxed text-parchment-300/40">
              {t("launcherOptions.queryPortDescription", {
                defaultValue:
                  "Steam's server-list/query-protocol port, separate from the game port. Only matters if you run more than one Palworld server on this machine - give each one its own value to avoid collisions.",
              })}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Input
                id="flag-query-port"
                type="number"
                value={queryPort ?? ""}
                onChange={(e) => handleQueryPortChange(e.target.value)}
                className="max-w-[10rem] font-mono"
                disabled={savingQueryPort}
              />
              <RuneButton
                type="button"
                variant="gold"
                size="sm"
                icon={<Save />}
                onClick={handleSaveQueryPort}
                disabled={!queryPortDirty || savingQueryPort || !queryPort}
              >
                {savingQueryPort
                  ? t("launcherOptions.queryPortSaving", { defaultValue: "Saving..." })
                  : t("launcherOptions.queryPortSave", { defaultValue: "Save Query Port" })}
              </RuneButton>
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs text-parchment-300/45">
          {t("launcherOptions.applyNote", {
            defaultValue: "These options apply to {{name}} the next time it starts. Public IP and port values are read from Super Admin and cannot be edited here.",
            name: instance.name,
          })}
        </p>
      </ScrollPanel>
    </div>
  );
}
