import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { NexusModBrowser } from "@/components/mods/NexusModBrowser";
import type { Mod } from "@/types/models";

interface NexusBrowseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  installedNames: string[];
  onInstalled: (mods: Mod[]) => void;
}

export function NexusBrowseDialog({ open, onOpenChange, installedNames, onInstalled }: NexusBrowseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Browse Nexus Mods</DialogTitle>
          <DialogDescription>Search, filter, and add Palworld mods straight from Nexus Mods.</DialogDescription>
        </DialogHeader>
        <NexusModBrowser installedNames={installedNames} onInstalled={onInstalled} />
      </DialogContent>
    </Dialog>
  );
}
