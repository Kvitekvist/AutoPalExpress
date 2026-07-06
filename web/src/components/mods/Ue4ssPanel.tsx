import * as React from "react";
import { Zap, Download, Trash2, CircleCheck, CircleAlert, RefreshCw } from "lucide-react";
import { ue4ssApi, instancesApi } from "@/api";
import type { Ue4ssStatus, Ue4ssLatest } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { RuneDialog } from "@/components/fantasy/RuneDialog";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

export function Ue4ssPanel() {
  const [status, setStatus] = React.useState<Ue4ssStatus | null>(null);
  const [latest, setLatest] = React.useState<Ue4ssLatest | null>(null);
  const [serverConfigured, setServerConfigured] = React.useState(false);
  const [checking, setChecking] = React.useState(false);
  const [installing, setInstalling] = React.useState(false);
  const [uninstallOpen, setUninstallOpen] = React.useState(false);
  const [uninstalling, setUninstalling] = React.useState(false);
  const notifications = useNotifications();

  React.useEffect(() => {
    ue4ssApi.getStatus().then(setStatus);
    instancesApi.getActive().then((instance) => setServerConfigured(!!instance));
  }, []);

  async function handleCheck() {
    setChecking(true);
    try {
      const data = await ue4ssApi.getLatest();
      setLatest(data);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Couldn't check for the latest UE4SS release.";
      notifications.error({ title: "Check failed", message });
    } finally {
      setChecking(false);
    }
  }

  async function handleInstall() {
    setInstalling(true);
    try {
      const data = await ue4ssApi.install();
      setStatus(data);
      notifications.success({
        title: "UE4SS installed",
        message: data.installedVersion ? `Version ${data.installedVersion} is ready.` : undefined,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Couldn't install UE4SS.";
      notifications.error({ title: "Install failed", message });
    } finally {
      setInstalling(false);
    }
  }

  async function handleUninstall() {
    setUninstalling(true);
    try {
      const data = await ue4ssApi.uninstall();
      setStatus(data);
      notifications.warning({ title: "UE4SS removed", message: "Lua and Logic mods will no longer load." });
    } finally {
      setUninstalling(false);
      setUninstallOpen(false);
    }
  }

  if (!status) return null;

  const updateAvailable = status.installed && !!latest && latest.version !== status.installedVersion;

  return (
    <ScrollPanel icon={<Zap />} title="UE4SS Mod Loader">
      <p className="mb-4 text-xs leading-relaxed text-parchment-300/50">
        UE4SS is the mod loader most Nexus mods need to actually run (Lua scripts and Logic/Blueprint mods placed in
        your Mods folder). Installing a mod doesn't install this; it's a separate, one-time setup.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-stone-700 bg-abyss-900/40 px-4 py-3">
        <div className="flex items-center gap-2.5">
          {status.installed ? (
            <span className="flex items-center gap-1.5 text-sm text-life-400">
              <CircleCheck className="h-4 w-4" /> Installed &middot; {status.installedVersion ?? "unknown version"}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm text-parchment-300/50">
              <CircleAlert className="h-4 w-4" /> Not installed
            </span>
          )}
        </div>
        <RuneButton
          type="button"
          variant="ghost"
          size="sm"
          icon={<RefreshCw className={cn(checking && "animate-spin")} />}
          onClick={handleCheck}
          disabled={checking}
        >
          {checking ? "Checking..." : "Check for Updates"}
        </RuneButton>
      </div>

      {latest && (
        <p className="mt-2 text-xs text-parchment-300/50">
          Latest release: <span className="text-parchment-200">{latest.version}</span>
          {updateAvailable && <span className="ml-1.5 text-gold-400">Update available</span>}
        </p>
      )}

      {!serverConfigured && (
        <p className="mt-2 text-xs text-gold-400">Set your Palworld server folder above before installing.</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <RuneButton
          type="button"
          variant="gold"
          size="sm"
          icon={<Download />}
          onClick={handleInstall}
          disabled={installing || !serverConfigured}
        >
          {installing
            ? "Installing..."
            : status.installed
              ? updateAvailable
                ? `Update to ${latest?.version}`
                : "Reinstall"
              : "Install UE4SS"}
        </RuneButton>
        {status.installed && (
          <RuneButton
            type="button"
            variant="danger"
            size="sm"
            icon={<Trash2 />}
            onClick={() => setUninstallOpen(true)}
            disabled={uninstalling}
          >
            Uninstall
          </RuneButton>
        )}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-parchment-300/35">
        Some antivirus software flags UE4SS's <code>dwmapi.dll</code> because it uses DLL injection to hook the
        game; this is a well-known false positive for this tool, not a real threat.
      </p>

      <RuneDialog
        open={uninstallOpen}
        onOpenChange={setUninstallOpen}
        tone="danger"
        title="Uninstall UE4SS?"
        description="This removes the UE4SS loader and its built-in mods. Mods you installed yourself (like ones from Nexus) are left in place, but won't load without it."
        confirmLabel="Uninstall"
        onConfirm={handleUninstall}
        confirming={uninstalling}
      />
    </ScrollPanel>
  );
}
