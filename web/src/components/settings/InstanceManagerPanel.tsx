import * as React from "react";
import { Server, Plus, FolderPlus, Trash2, CircleCheck, CircleAlert } from "lucide-react";
import { instancesApi } from "@/api";
import type { InstanceListView, ServerInstance } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { RuneDialog } from "@/components/fantasy/RuneDialog";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { DeployServerWizard } from "./DeployServerWizard";
import { ImportServerDialog } from "./ImportServerDialog";
import { cn } from "@/lib/utils";

const SOURCE_LABEL: Record<ServerInstance["source"], string> = {
  deployed: "Deployed",
  steam: "Steam Library",
  manual: "Imported",
};

export function InstanceManagerPanel() {
  const [data, setData] = React.useState<InstanceListView | null>(null);
  const [deployOpen, setDeployOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [removeTarget, setRemoveTarget] = React.useState<ServerInstance | null>(null);
  const [removing, setRemoving] = React.useState(false);
  const [switching, setSwitching] = React.useState<string | null>(null);
  const notifications = useNotifications();
  const { user } = useAuth();
  const isSuperAdmin = user.role === "super_admin";

  const refresh = React.useCallback(() => {
    instancesApi.list().then(setData);
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleSwitch(id: string) {
    setSwitching(id);
    try {
      const next = await instancesApi.setActive(id);
      setData(next);
      const instance = next.instances.find((i) => i.id === id);
      notifications.success({ title: "Switched server", message: instance?.name });
      // Every page reads the active instance independently - reload so they all pick it up.
      window.location.reload();
    } finally {
      setSwitching(null);
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      const next = await instancesApi.removeInstance(removeTarget.id);
      setData(next);
      notifications.warning({
        title: "Server unregistered",
        message: `${removeTarget.name} was removed from this tool. Its files were not touched.`,
      });
    } finally {
      setRemoving(false);
      setRemoveTarget(null);
    }
  }

  function handleCreated() {
    refresh();
    window.location.reload();
  }

  if (!data) return null;

  return (
    <ScrollPanel
      icon={<Server />}
      title="Server Instances"
      actions={
        isSuperAdmin && (
          <>
            <RuneButton
              type="button"
              variant="mana"
              size="sm"
              icon={<FolderPlus />}
              onClick={() => setImportOpen(true)}
            >
              Import Existing
            </RuneButton>
            <RuneButton type="button" variant="gold" size="sm" icon={<Plus />} onClick={() => setDeployOpen(true)}>
              Deploy New Server
            </RuneButton>
          </>
        )
      }
    >
      {data.instances.length === 0 ? (
        <p className="text-sm text-parchment-300/50">
          {isSuperAdmin
            ? "No servers yet. Deploy a fresh, isolated Palworld server or import one you already have installed."
            : "No servers set up yet. Ask the super admin to deploy or import one."}
        </p>
      ) : (
        <div className="space-y-3">
          {data.instances.map((instance) => {
            const active = instance.id === data.activeId;
            return (
              <div
                key={instance.id}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3",
                  active ? "border-gold-500/50 bg-gold-500/5" : "border-stone-700 bg-abyss-900/40"
                )}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-display text-sm font-semibold text-parchment-100">{instance.name}</p>
                    <span className="rounded-full border border-stone-600 bg-stone-800/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-parchment-300/60">
                      {SOURCE_LABEL[instance.source]}
                    </span>
                    {active && (
                      <span className="rounded-full border border-gold-500/50 bg-gold-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gold-300">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate font-mono text-xs text-parchment-300/50">{instance.serverPath}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-parchment-300/50">
                    {instance.executableFound ? (
                      <span className="flex items-center gap-1 text-life-400">
                        <CircleCheck className="h-3 w-3" /> Found on disk
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-blood-400">
                        <CircleAlert className="h-3 w-3" /> Not found on disk
                      </span>
                    )}
                    <span>Port {instance.gamePort}</span>
                    <span>{instance.ue4ssInstalled ? `UE4SS ${instance.ue4ssVersion}` : "UE4SS not installed"}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!active && (
                    <RuneButton
                      type="button"
                      variant="mana"
                      size="sm"
                      onClick={() => handleSwitch(instance.id)}
                      disabled={switching === instance.id}
                    >
                      {switching === instance.id ? "Switching..." : "Switch To"}
                    </RuneButton>
                  )}
                  {isSuperAdmin && (
                    <RuneButton
                      type="button"
                      variant="danger"
                      size="sm"
                      icon={<Trash2 />}
                      onClick={() => setRemoveTarget(instance)}
                    >
                      Remove
                    </RuneButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isSuperAdmin && (
        <>
          <DeployServerWizard open={deployOpen} onOpenChange={setDeployOpen} onDeployed={handleCreated} />
          <ImportServerDialog open={importOpen} onOpenChange={setImportOpen} onImported={handleCreated} />
        </>
      )}

      <RuneDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        tone="danger"
        title="Remove this server?"
        description={`${removeTarget?.name} will be unregistered from this tool. Its actual files, mods, and world saves are left untouched on disk.`}
        confirmLabel="Remove"
        onConfirm={handleRemove}
        confirming={removing}
      />
    </ScrollPanel>
  );
}
