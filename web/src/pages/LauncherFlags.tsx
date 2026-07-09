import * as React from "react";
import { Rocket } from "lucide-react";
import { instancesApi, networkApi } from "@/api";
import type { ServerInstance, UpnpStatus } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { EnchantedToggle } from "@/components/fantasy/EnchantedToggle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNotifications } from "@/hooks/useNotifications";

export default function LauncherFlags() {
  const [instance, setInstance] = React.useState<ServerInstance | null>(null);
  const [networkStatus, setNetworkStatus] = React.useState<UpnpStatus | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const notifications = useNotifications();

  const load = React.useCallback(() => {
    setLoaded(false);
    Promise.all([instancesApi.getActive(), networkApi.getUpnpStatus().catch(() => null)])
      .then(([active, status]) => {
        setInstance(active);
        setNetworkStatus(status);
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
        title: "Launcher options saved",
        message: "Restart the server for these launcher options to take effect.",
      });
    } finally {
      setSaving(false);
    }
  }

  const publicIp = networkStatus?.externalIp ?? "";
  const publicPort = networkStatus?.port ?? instance?.gamePort ?? "";

  if (!loaded) {
    return (
      <div className="flex h-64 items-center justify-center text-parchment-300/50">
        <p className="animate-pulse font-display">Loading launcher options...</p>
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="flex h-64 items-center justify-center text-parchment-300/50">
        <p className="font-display">Select a server to edit launcher options.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <ScrollPanel icon={<Rocket />} title="Launcher Options">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <EnchantedToggle
            id="flag-community-server"
            checked={instance.communityServer}
            disabled={saving}
            onCheckedChange={(checked) => saveLaunchOptions({ communityServer: checked })}
            label="-publiclobby"
            description="Shows the server in Palworld's Community Server list."
          />
          <EnchantedToggle
            id="flag-useperfthreads"
            checked={instance.usePerfThreads}
            disabled={saving}
            onCheckedChange={(checked) => saveLaunchOptions({ usePerfThreads: checked })}
            label="-useperfthreads"
            description="Enables Palworld's performance-thread launcher path."
          />
          <EnchantedToggle
            id="flag-no-async-loading-thread"
            checked={instance.noAsyncLoadingThread}
            disabled={saving}
            onCheckedChange={(checked) => saveLaunchOptions({ noAsyncLoadingThread: checked })}
            label="-NoAsyncLoadingThread"
            description="Disables Palworld's separate async loading thread."
          />
          <EnchantedToggle
            id="flag-use-multithread-for-ds"
            checked={instance.useMultithreadForDs}
            disabled={saving}
            onCheckedChange={(checked) => saveLaunchOptions({ useMultithreadForDs: checked })}
            label="-UseMultithreadForDS"
            description="Uses Palworld's dedicated-server multithreading flag."
          />
          <div className="space-y-3 rounded-md border border-stone-700 bg-abyss-950/40 p-4">
            <EnchantedToggle
              id="flag-public-ip"
              checked={instance.usePublicIpOverride}
              disabled={saving}
              onCheckedChange={(checked) => saveLaunchOptions({ usePublicIpOverride: checked })}
              label="-publicip"
              description="Advertises the public IP detected by Super Admin."
              className="border-0 bg-transparent p-0"
            />
            <div className={instance.usePublicIpOverride ? "opacity-60" : "opacity-35"}>
              <Label htmlFor="flag-public-ip-value" className="text-[11px]">
                Super Admin public IP
              </Label>
              <Input
                id="flag-public-ip-value"
                value={publicIp || "Unavailable"}
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
              description="Advertises the game port from Super Admin."
              className="border-0 bg-transparent p-0"
            />
            <div className={instance.usePublicPortOverride ? "opacity-60" : "opacity-35"}>
              <Label htmlFor="flag-public-port-value" className="text-[11px]">
                Super Admin game port
              </Label>
              <Input
                id="flag-public-port-value"
                value={publicPort ? String(publicPort) : "Unavailable"}
                disabled
                className="mt-1 font-mono"
              />
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs text-parchment-300/45">
          These options apply to {instance.name} the next time it starts. Public IP and port values are read from Super
          Admin and cannot be edited here.
        </p>
      </ScrollPanel>
    </div>
  );
}
