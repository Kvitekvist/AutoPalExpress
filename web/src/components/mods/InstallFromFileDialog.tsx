import * as React from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";
import { modsApi } from "@/api";
import type { Mod, VerifiedFileInstall } from "@/types/models";
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

interface InstallFromFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInstalled: (mods: Mod[]) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function InstallFromFileDialog({ open, onOpenChange, onInstalled }: InstallFromFileDialogProps) {
  const { t } = useTranslation();
  const [checking, setChecking] = React.useState(false);
  const [verified, setVerified] = React.useState<VerifiedFileInstall | null>(null);
  const [installing, setInstalling] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const notifications = useNotifications();

  function reset() {
    setChecking(false);
    setVerified(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  React.useEffect(() => {
    if (!open) reset();
  }, [open]);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setChecking(true);
    setError(null);
    try {
      const result = await modsApi.prepareInstallFromFile(file);
      setVerified(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("mods.installFromFile.verifyErrorFallback", { defaultValue: "Couldn't verify that file." }));
    } finally {
      setChecking(false);
    }
  }

  async function handleCancelVerified() {
    if (verified) await modsApi.cancelInstallFromFile(verified.token);
    reset();
  }

  async function handleConfirm() {
    if (!verified) return;
    setInstalling(true);
    setError(null);
    try {
      const mods = await modsApi.confirmInstallFromFile(verified.token);
      onInstalled(mods);
      notifications.success({
        title: t("mods.installFromFile.installedTitle", { defaultValue: "Mod installed" }),
        message: t("mods.installFromFile.installedMessage", {
          defaultValue: "{{name}} has been bound to your server.",
          name: verified.modName,
        }),
      });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("mods.installFromFile.installErrorFallback", { defaultValue: "Couldn't install that file." }));
    } finally {
      setInstalling(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("mods.installFromFile.title", { defaultValue: "Install From a Downloaded File" })}</DialogTitle>
          <DialogDescription>
            {t("mods.installFromFile.description", {
              defaultValue:
                "For mods you downloaded from Nexus yourself. Upload the .zip you already downloaded; it's checked against Nexus's own records by its exact file hash before anything is installed. Files that don't match a real, published Palworld mod are rejected.",
            })}
          </DialogDescription>
        </DialogHeader>

        {!verified ? (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleFileSelected}
              disabled={checking}
              className="block w-full text-sm text-parchment-300/70 file:mr-3 file:rounded-md file:border file:border-stone-600 file:bg-stone-800 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-parchment-200 hover:file:border-gold-600/50"
            />
            {checking && (
              <p className="animate-pulse text-xs text-parchment-300/50">
                {t("mods.installFromFile.uploading", { defaultValue: "Uploading and checking against Nexus..." })}
              </p>
            )}
            {error && <p className="text-xs text-blood-400">{error}</p>}
            <p className="text-[11px] leading-relaxed text-parchment-300/40">
              {t("mods.installFromFile.fileHint", {
                defaultValue: "Only .zip archives are supported, up to 500 MB. The file's hash must exactly match a file Nexus actually hosts for this game.",
              })}
            </p>
          </div>
        ) : (
          <div className="space-y-3 rounded-md border border-life-500/30 bg-life-500/5 px-4 py-3">
            <p className="flex items-center gap-1.5 text-sm font-medium text-life-400">
              <ShieldCheck className="h-4 w-4 shrink-0" /> {t("mods.installFromFile.verified", { defaultValue: "Verified against Nexus Mods" })}
            </p>
            <p className="text-sm text-parchment-100">
              <span className="font-semibold">{verified.modName}</span>{" "}
              {t("mods.installFromFile.byAuthorVersion", { defaultValue: "by {{author}} · v{{version}}", author: verified.author, version: verified.version })}
            </p>
            <p className="text-xs text-parchment-300/50">
              {t("mods.installFromFile.sizeAndConfirm", { defaultValue: "{{size}}. Install this mod?", size: formatBytes(verified.sizeBytes) })}
            </p>
            {error && <p className="text-xs text-blood-400">{error}</p>}
          </div>
        )}

        <DialogFooter>
          {!verified ? (
            <RuneButton variant="ghost" onClick={() => onOpenChange(false)} disabled={checking}>
              {t("mods.installFromFile.cancel", { defaultValue: "Cancel" })}
            </RuneButton>
          ) : (
            <>
              <RuneButton variant="ghost" onClick={handleCancelVerified} disabled={installing}>
                {t("mods.installFromFile.cancel", { defaultValue: "Cancel" })}
              </RuneButton>
              <RuneButton variant="gold" onClick={handleConfirm} disabled={installing}>
                {installing
                  ? t("mods.installFromFile.installing", { defaultValue: "Installing..." })
                  : t("mods.installFromFile.installNamed", { defaultValue: 'Install "{{name}}"', name: verified.modName })}
              </RuneButton>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
