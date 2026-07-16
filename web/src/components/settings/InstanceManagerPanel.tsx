import * as React from "react";
import { useTranslation } from "react-i18next";
import { Server, Plus, FolderPlus, FolderInput, Trash2, CircleCheck, CircleAlert, FolderOpen } from "lucide-react";
import { instancesApi } from "@/api";
import type { InstanceListView, ServerInstance } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { RuneDialog } from "@/components/fantasy/RuneDialog";
import { useNotifications } from "@/hooks/useNotifications";
import { DeployServerWizard } from "./DeployServerWizard";
import { ImportServerDialog } from "./ImportServerDialog";
import { SaveImportDialog } from "./SaveImportDialog";
import { cn } from "@/lib/utils";

const SOURCE_LABEL_KEYS: Record<ServerInstance["source"], { key: string; fallback: string }> = {
  deployed: { key: "deployed", fallback: "Deployed" },
  steam: { key: "steam", fallback: "Steam Library" },
  manual: { key: "manual", fallback: "Imported" },
};

export function InstanceManagerPanel() {
  const { t } = useTranslation();
  const [data, setData] = React.useState<InstanceListView | null>(null);
  const [deployOpen, setDeployOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [saveImportOpen, setSaveImportOpen] = React.useState(false);
  const [removeTarget, setRemoveTarget] = React.useState<ServerInstance | null>(null);
  const [deleteFiles, setDeleteFiles] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [switching, setSwitching] = React.useState<string | null>(null);
  const [opening, setOpening] = React.useState<string | null>(null);
  const notifications = useNotifications();

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
      notifications.success({
        title: t("settings.instances.switchedTitle", { defaultValue: "Switched server" }),
        message: instance?.name,
      });
      // Every page reads the active instance independently - reload so they all pick it up.
      window.location.reload();
    } finally {
      setSwitching(null);
    }
  }

  async function handleOpen(instance: ServerInstance) {
    setOpening(instance.id);
    try {
      await instancesApi.openInstanceFolder(instance.id);
      notifications.info({
        title: t("settings.instances.browsingTitle", { defaultValue: "Browsing server files" }),
        message: instance.serverPath,
      });
    } catch (e) {
      notifications.error({
        title: t("settings.instances.openFolderFailedTitle", { defaultValue: "Could not open folder" }),
        message:
          e instanceof Error ? e.message : t("settings.instances.unknownError", { defaultValue: "Unknown error." }),
      });
    } finally {
      setOpening(null);
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await instancesApi.removeInstance(removeTarget.id, deleteFiles);
      if (deleteFiles) {
        notifications.warning({
          title: t("settings.instances.deletedTitle", { defaultValue: "Server deleted" }),
          message: t("settings.instances.deletedMessage", {
            defaultValue: "{{name}} was removed from this tool and its server folder was deleted.",
            name: removeTarget.name,
          }),
        });
      } else {
        notifications.warning({
          title: t("settings.instances.unregisteredTitle", { defaultValue: "Server unregistered" }),
          message: t("settings.instances.unregisteredMessage", {
            defaultValue: "{{name}} was removed from this tool. Its files were not touched.",
            name: removeTarget.name,
          }),
        });
      }
      // Every page (including the TopBar server switcher) reads the instance
      // list independently and only on mount - reload so they all pick up
      // the removal instead of showing a stale, now-deleted server until a
      // manual browser refresh (TICKET-0150), same as handleSwitch below.
      window.location.reload();
    } catch (e) {
      notifications.error({
        title: t("settings.instances.removeFailedTitle", { defaultValue: "Could not remove server" }),
        message:
          e instanceof Error ? e.message : t("settings.instances.unknownError", { defaultValue: "Unknown error." }),
      });
    } finally {
      setRemoving(false);
      setRemoveTarget(null);
      setDeleteFiles(false);
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
      title={t("settings.instances.title", { defaultValue: "Server Instances" })}
      actions={
        <>
          <RuneButton type="button" variant="mana" size="sm" icon={<FolderPlus />} onClick={() => setImportOpen(true)}>
            {t("settings.instances.importExisting", { defaultValue: "Import Existing" })}
          </RuneButton>
          <RuneButton type="button" variant="gold" size="sm" icon={<Plus />} onClick={() => setDeployOpen(true)}>
            {t("settings.instances.deployNew", { defaultValue: "Deploy New Server" })}
          </RuneButton>
          <RuneButton
            type="button"
            variant="arcane"
            size="sm"
            icon={<FolderInput />}
            onClick={() => setSaveImportOpen(true)}
          >
            {t("settings.saveImport.open", { defaultValue: "Import Save" })}
          </RuneButton>
        </>
      }
    >
      {data.instances.length === 0 ? (
        <p className="text-sm text-parchment-300/50">
          {t("settings.instances.empty", {
            defaultValue:
              "No servers yet. Deploy a fresh, isolated Palworld server or import one you already have installed.",
          })}
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
                      {t(`settings.instances.source.${SOURCE_LABEL_KEYS[instance.source].key}`, {
                        defaultValue: SOURCE_LABEL_KEYS[instance.source].fallback,
                      })}
                    </span>
                    {active && (
                      <span className="rounded-full border border-gold-500/50 bg-gold-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gold-300">
                        {t("settings.instances.active", { defaultValue: "Active" })}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate font-mono text-xs text-parchment-300/50">{instance.serverPath}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-parchment-300/50">
                    {instance.executableFound ? (
                      <span className="flex items-center gap-1 text-life-400">
                        <CircleCheck className="h-3 w-3" />{" "}
                        {t("settings.instances.foundOnDisk", { defaultValue: "Found on disk" })}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-blood-400">
                        <CircleAlert className="h-3 w-3" />{" "}
                        {t("settings.instances.notFoundOnDisk", { defaultValue: "Not found on disk" })}
                      </span>
                    )}
                    <span>
                      {t("settings.instances.port", { defaultValue: "Port {{port}}", port: instance.gamePort })}
                    </span>
                    <span>
                      {instance.ue4ssInstalled
                        ? t("settings.instances.ue4ssVersion", {
                            defaultValue: "UE4SS {{version}}",
                            version: instance.ue4ssVersion,
                          })
                        : t("settings.instances.ue4ssNotInstalled", { defaultValue: "UE4SS not installed" })}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <RuneButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={<FolderOpen />}
                    onClick={() => handleOpen(instance)}
                    disabled={opening === instance.id || !instance.exists}
                  >
                    {opening === instance.id
                      ? t("settings.instances.opening", { defaultValue: "Opening..." })
                      : t("settings.instances.browseFiles", { defaultValue: "Browse Files" })}
                  </RuneButton>
                  {!active && (
                    <RuneButton
                      type="button"
                      variant="mana"
                      size="sm"
                      onClick={() => handleSwitch(instance.id)}
                      disabled={switching === instance.id}
                    >
                      {switching === instance.id
                        ? t("settings.instances.switching", { defaultValue: "Switching..." })
                        : t("settings.instances.switchTo", { defaultValue: "Switch To" })}
                    </RuneButton>
                  )}
                  <RuneButton
                    type="button"
                    variant="danger"
                    size="sm"
                    icon={<Trash2 />}
                    onClick={() => {
                      setDeleteFiles(false);
                      setRemoveTarget(instance);
                    }}
                  >
                    {t("settings.instances.remove", { defaultValue: "Remove" })}
                  </RuneButton>
                  <RuneButton
                    type="button"
                    variant="danger"
                    size="sm"
                    icon={<Trash2 />}
                    onClick={() => {
                      setDeleteFiles(true);
                      setRemoveTarget(instance);
                    }}
                  >
                    {t("settings.instances.removeAndDelete", { defaultValue: "Remove and Delete" })}
                  </RuneButton>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DeployServerWizard open={deployOpen} onOpenChange={setDeployOpen} onDeployed={handleCreated} />
      <ImportServerDialog open={importOpen} onOpenChange={setImportOpen} onImported={handleCreated} />
      <SaveImportDialog open={saveImportOpen} onOpenChange={setSaveImportOpen} onImported={() => {}} />

      <RuneDialog
        open={!!removeTarget}
        onOpenChange={(o) => {
          if (!o) {
            setRemoveTarget(null);
            setDeleteFiles(false);
          }
        }}
        tone="danger"
        title={
          deleteFiles
            ? t("settings.instances.removeDeleteDialog.title", { defaultValue: "Remove and delete this server?" })
            : t("settings.instances.removeDialog.title", { defaultValue: "Remove this server?" })
        }
        description={
          deleteFiles
            ? t("settings.instances.removeDeleteDialog.description", {
                defaultValue:
                  "{{name}} will be unregistered from this tool and its server folder will be deleted from disk, including mods and world saves. Stop the server first.",
                name: removeTarget?.name,
              })
            : t("settings.instances.removeDialog.description", {
                defaultValue:
                  "{{name}} will be unregistered from this tool. Its actual files, mods, and world saves are left untouched on disk.",
                name: removeTarget?.name,
              })
        }
        confirmLabel={
          deleteFiles
            ? t("settings.instances.removeAndDelete", { defaultValue: "Remove and Delete" })
            : t("settings.instances.remove", { defaultValue: "Remove" })
        }
        onConfirm={handleRemove}
        confirming={removing}
      />
    </ScrollPanel>
  );
}
