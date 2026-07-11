import * as React from "react";
import { useTranslation } from "react-i18next";
import { Crown, FileArchive } from "lucide-react";
import { modsApi } from "@/api";
import type { Mod, NexusModFile } from "@/types/models";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

interface NexusFilePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nexusModId: number | null;
  modName: string;
  onInstalled: (mods: Mod[]) => void;
}

function formatSize(sizeKb?: number | null): string {
  if (!sizeKb) return "";
  if (sizeKb < 1024) return `${sizeKb} KB`;
  return `${(sizeKb / 1024).toFixed(1)} MB`;
}

export function NexusFilePickerDialog({ open, onOpenChange, nexusModId, modName, onInstalled }: NexusFilePickerDialogProps) {
  const { t } = useTranslation();
  const notifications = useNotifications();
  const [files, setFiles] = React.useState<NexusModFile[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = React.useState<number | null>(null);
  const [installing, setInstalling] = React.useState(false);

  React.useEffect(() => {
    if (!open || nexusModId == null) return;
    setLoading(true);
    setLoadError(null);
    setSelectedFileId(null);
    modsApi
      .getNexusModFiles(nexusModId)
      .then((result) => {
        setFiles(result);
        setSelectedFileId(result[0]?.fileId ?? null);
      })
      .catch((e) =>
        setLoadError(e instanceof Error ? e.message : t("mods.filePicker.loadErrorFallback", { defaultValue: "Couldn't load this mod's files from Nexus." }))
      )
      .finally(() => setLoading(false));
  }, [open, nexusModId, t]);

  async function handleInstall() {
    if (nexusModId == null || selectedFileId == null) return;
    setInstalling(true);
    try {
      const mods = await modsApi.installFromNexus(nexusModId, selectedFileId);
      onInstalled(mods);
      notifications.success({
        title: t("mods.nexusBrowser.installedTitle", { defaultValue: "Mod installed" }),
        message: t("mods.nexusBrowser.installedMessage", { defaultValue: "{{name}} was installed from Nexus Mods.", name: modName }),
      });
      onOpenChange(false);
    } catch (e) {
      notifications.error({
        title: t("mods.nexusBrowser.installFailedTitle", { defaultValue: "Nexus install failed" }),
        message: e instanceof Error ? e.message : t("mods.nexusBrowser.unknownError", { defaultValue: "Unknown error." }),
      });
    } finally {
      setInstalling(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("mods.filePicker.title", { defaultValue: "Choose a File" })}</DialogTitle>
          <DialogDescription>
            {t("mods.filePicker.description", {
              defaultValue: '"{{name}}" has more than one file on Nexus Mods. Pick which one to install.',
              name: modName,
            })}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="animate-pulse py-4 text-center text-xs text-parchment-300/50">
            {t("mods.filePicker.loading", { defaultValue: "Fetching file list from Nexus Mods..." })}
          </p>
        ) : loadError ? (
          <p className="py-4 text-center text-xs text-blood-400">{loadError}</p>
        ) : (
          <div className="max-h-[320px] space-y-2 overflow-y-auto">
            {files.map((file) => (
              <button
                key={file.fileId}
                type="button"
                onClick={() => setSelectedFileId(file.fileId)}
                className={cn(
                  "flex w-full flex-col gap-1 rounded-md border px-3 py-2 text-left transition-colors",
                  selectedFileId === file.fileId
                    ? "border-gold-500/60 bg-gold-500/10"
                    : "border-stone-700 bg-abyss-950/40 hover:border-gold-600/40"
                )}
              >
                <span className="flex items-center gap-1.5 text-sm font-medium text-parchment-100">
                  {file.isMain ? (
                    <Crown className="h-3.5 w-3.5 shrink-0 text-gold-400" />
                  ) : (
                    <FileArchive className="h-3.5 w-3.5 shrink-0 text-parchment-300/50" />
                  )}
                  {file.name}
                </span>
                <span className="text-[11px] text-parchment-300/50">
                  {[file.category, file.version && `v${file.version}`, formatSize(file.sizeKb)].filter(Boolean).join(" · ")}
                </span>
                {file.description && <span className="text-[11px] text-parchment-300/40">{file.description}</span>}
              </button>
            ))}
          </div>
        )}

        <DialogFooter>
          <RuneButton variant="ghost" onClick={() => onOpenChange(false)} disabled={installing}>
            {t("mods.filePicker.cancel", { defaultValue: "Cancel" })}
          </RuneButton>
          <RuneButton variant="gold" onClick={handleInstall} disabled={installing || selectedFileId == null || loading}>
            {installing
              ? t("mods.filePicker.installing", { defaultValue: "Installing..." })
              : t("mods.filePicker.install", { defaultValue: "Install Selected File" })}
          </RuneButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
