import * as React from "react";
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
      setError(err instanceof Error ? err.message : "Couldn't verify that file.");
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
      notifications.success({ title: "Mod installed", message: `${verified.modName} has been bound to your server.` });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't install that file.");
    } finally {
      setInstalling(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Install From a Downloaded File</DialogTitle>
          <DialogDescription>
            For mods you can't auto-install without Nexus Premium. Upload the .zip you already downloaded; it's
            checked against Nexus's own records by its exact file hash before anything is installed. Files that
            don't match a real, published Palworld mod are rejected.
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
            {checking && <p className="animate-pulse text-xs text-parchment-300/50">Uploading and checking against Nexus...</p>}
            {error && <p className="text-xs text-blood-400">{error}</p>}
            <p className="text-[11px] leading-relaxed text-parchment-300/40">
              Only .zip archives are supported, up to 500 MB. The file's hash must exactly match a file Nexus
              actually hosts for this game.
            </p>
          </div>
        ) : (
          <div className="space-y-3 rounded-md border border-life-500/30 bg-life-500/5 px-4 py-3">
            <p className="flex items-center gap-1.5 text-sm font-medium text-life-400">
              <ShieldCheck className="h-4 w-4 shrink-0" /> Verified against Nexus Mods
            </p>
            <p className="text-sm text-parchment-100">
              <span className="font-semibold">{verified.modName}</span> by {verified.author} &middot; v
              {verified.version}
            </p>
            <p className="text-xs text-parchment-300/50">{formatBytes(verified.sizeBytes)}. Install this mod?</p>
            {error && <p className="text-xs text-blood-400">{error}</p>}
          </div>
        )}

        <DialogFooter>
          {!verified ? (
            <RuneButton variant="ghost" onClick={() => onOpenChange(false)} disabled={checking}>
              Cancel
            </RuneButton>
          ) : (
            <>
              <RuneButton variant="ghost" onClick={handleCancelVerified} disabled={installing}>
                Cancel
              </RuneButton>
              <RuneButton variant="gold" onClick={handleConfirm} disabled={installing}>
                {installing ? "Installing..." : `Install "${verified.modName}"`}
              </RuneButton>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
