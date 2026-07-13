import * as React from "react";
import { useTranslation } from "react-i18next";
import { FolderOpen, TriangleAlert } from "lucide-react";
import { automationApi } from "@/api";
import type { SaveImportCandidate } from "@/types/models";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

interface SaveImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SaveImportDialog({ open, onOpenChange, onImported }: SaveImportDialogProps) {
  const { t } = useTranslation();
  const [path, setPath] = React.useState("");
  const [candidates, setCandidates] = React.useState<SaveImportCandidate[] | null>(null);
  const [selected, setSelected] = React.useState<SaveImportCandidate | null>(null);
  const [inspecting, setInspecting] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const notifications = useNotifications();

  React.useEffect(() => {
    if (!open) {
      setPath("");
      setCandidates(null);
      setSelected(null);
      setError(null);
    }
  }, [open]);

  async function handleInspect(targetPath: string) {
    if (!targetPath.trim()) return;
    setInspecting(true);
    setError(null);
    setCandidates(null);
    setSelected(null);
    try {
      const { candidates: found } = await automationApi.inspectSaveImport(targetPath.trim());
      setCandidates(found);
      if (found.length === 1) setSelected(found[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("settings.saveImport.inspectFailedFallback", { defaultValue: "Couldn't read that folder." }));
    } finally {
      setInspecting(false);
    }
  }

  async function handleBrowse() {
    const { path: picked } = await automationApi.browseSaveImportDir();
    if (picked) {
      setPath(picked);
      await handleInspect(picked);
    }
  }

  async function handleImport() {
    if (!selected) return;
    setImporting(true);
    setError(null);
    try {
      const result = await automationApi.applySaveImport(selected.path);
      notifications.success({
        title: t("settings.saveImport.importedTitle", { defaultValue: "Save imported" }),
        message: result.backupCreated
          ? t("settings.saveImport.importedWithBackupMessage", {
              defaultValue: "{{name}} is now the server's active save. Its previous save was backed up first.",
              name: result.worldName,
            })
          : t("settings.saveImport.importedMessage", {
              defaultValue: "{{name}} is now the server's active save.",
              name: result.worldName,
            }),
      });
      onImported();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("settings.saveImport.importFailedFallback", { defaultValue: "Couldn't import that save." }));
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("settings.saveImport.title", { defaultValue: "Import a World Save" })}</DialogTitle>
          <DialogDescription>
            {t("settings.saveImport.description", {
              defaultValue:
                "Bring a co-op or single-player save from another PC onto this server. Steam does not need to be installed here - just point to the copied save folder.",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="save-import-path">
              {t("settings.saveImport.sourceFolder", { defaultValue: "Save Folder" })}
            </Label>
            <div className="flex gap-2">
              <Input
                id="save-import-path"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                onBlur={() => handleInspect(path)}
                placeholder="D:\PalworldSaveBackup\SaveGames\76561198000000000"
                className="flex-1"
              />
              <RuneButton type="button" variant="ghost" size="sm" icon={<FolderOpen />} onClick={handleBrowse}>
                {t("settings.saveImport.browse", { defaultValue: "Browse" })}
              </RuneButton>
            </div>
            <p className="text-[11px] text-parchment-300/40">
              {t("settings.saveImport.sourceFolderHint", {
                defaultValue: "Pick the world's own save folder, or its parent folder if you're not sure which one it is.",
              })}
            </p>
          </div>

          {inspecting && (
            <p className="animate-pulse text-sm text-parchment-300/50">
              {t("settings.saveImport.inspecting", { defaultValue: "Reading save data..." })}
            </p>
          )}

          {candidates && candidates.length > 1 && (
            <div className="space-y-2">
              <Label>{t("settings.saveImport.chooseWorld", { defaultValue: "Multiple saves found - choose one" })}</Label>
              <div className="max-h-48 space-y-1.5 overflow-y-auto">
                {candidates.map((c) => (
                  <button
                    key={c.path}
                    type="button"
                    onClick={() => setSelected(c)}
                    className={cn(
                      "w-full rounded-md border px-3 py-2 text-left text-xs transition-colors",
                      selected?.path === c.path
                        ? "border-gold-500/50 bg-gold-500/5 text-gold-200"
                        : "border-stone-700 bg-abyss-900/40 text-parchment-300/70 hover:border-stone-600"
                    )}
                  >
                    <p className="truncate font-mono">{c.name}</p>
                    <p className="mt-0.5 text-[11px] text-parchment-300/40">
                      {formatBytes(c.sizeBytes)} - {new Date(c.modified).toLocaleString()}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selected && (
            <div className="flex flex-wrap items-start gap-2 rounded-md border border-gold-600/30 bg-gold-500/5 px-4 py-3 text-xs text-gold-300">
              <TriangleAlert className="h-4 w-4 shrink-0" />
              <span>
                {t("settings.saveImport.overwriteWarning", {
                  defaultValue:
                    "This replaces the server's current save with \"{{name}}\". The server must be stopped, and its existing save will be backed up automatically first.",
                  name: selected.name,
                })}
              </span>
            </div>
          )}
        </div>

        {error && <p className="text-xs text-blood-400">{error}</p>}

        <DialogFooter>
          <RuneButton variant="ghost" onClick={() => onOpenChange(false)}>
            {t("settings.saveImport.cancel", { defaultValue: "Cancel" })}
          </RuneButton>
          <RuneButton variant="gold" onClick={handleImport} disabled={!selected || importing}>
            {importing
              ? t("settings.saveImport.importing", { defaultValue: "Importing..." })
              : t("settings.saveImport.import", { defaultValue: "Import Save" })}
          </RuneButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
