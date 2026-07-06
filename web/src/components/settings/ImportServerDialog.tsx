import * as React from "react";
import { FolderOpen, Radar } from "lucide-react";
import { instancesApi } from "@/api";
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

interface ImportServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function ImportServerDialog({ open, onOpenChange, onImported }: ImportServerDialogProps) {
  const [name, setName] = React.useState("");
  const [path, setPath] = React.useState("");
  const [detecting, setDetecting] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const notifications = useNotifications();

  React.useEffect(() => {
    if (!open) {
      setName("");
      setPath("");
      setError(null);
    }
  }, [open]);

  async function handleDetect() {
    setDetecting(true);
    setError(null);
    try {
      await instancesApi.importDetected();
      notifications.success({ title: "Server imported", message: "Found and registered via your Steam library." });
      onImported();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't find a Palworld server in any Steam library.");
    } finally {
      setDetecting(false);
    }
  }

  async function handleBrowse() {
    const { path: picked } = await instancesApi.browseImportDir();
    if (picked) setPath(picked);
  }

  async function handleImport() {
    setImporting(true);
    setError(null);
    try {
      await instancesApi.importExisting(name.trim(), path.trim());
      notifications.success({ title: "Server imported", message: name.trim() });
      onImported();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't import that folder.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import an Existing Server</DialogTitle>
          <DialogDescription>Register a Palworld Dedicated Server you already have installed.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RuneButton
            type="button"
            variant="mana"
            icon={<Radar />}
            onClick={handleDetect}
            disabled={detecting}
            className="w-full"
          >
            {detecting ? "Scanning Steam libraries..." : "Auto-Detect via Steam"}
          </RuneButton>

          <div className="flex items-center gap-3 text-[11px] uppercase tracking-wide text-parchment-300/40">
            <div className="h-px flex-1 bg-stone-700" /> or enter manually{" "}
            <div className="h-px flex-1 bg-stone-700" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="import-name">Server Name</Label>
            <Input
              id="import-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Palworld Server"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="import-path">Install Folder</Label>
            <div className="flex gap-2">
              <Input
                id="import-path"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="D:\SteamLibrary\steamapps\common\PalServer"
                className="flex-1"
              />
              <RuneButton type="button" variant="ghost" size="sm" icon={<FolderOpen />} onClick={handleBrowse}>
                Browse
              </RuneButton>
            </div>
          </div>
        </div>

        {error && <p className="text-xs text-blood-400">{error}</p>}

        <DialogFooter>
          <RuneButton variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </RuneButton>
          <RuneButton variant="gold" onClick={handleImport} disabled={importing || !name.trim() || !path.trim()}>
            {importing ? "Importing..." : "Import"}
          </RuneButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
