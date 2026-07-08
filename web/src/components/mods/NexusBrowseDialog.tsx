import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { NexusModBrowser } from "@/components/mods/NexusModBrowser";

interface NexusBrowseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  installedNames: string[];
}

export function NexusBrowseDialog({ open, onOpenChange, installedNames }: NexusBrowseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Browse Nexus Mods</DialogTitle>
          <DialogDescription>
            Search and filter Palworld mods from Nexus Mods. Downloads happen on Nexus; install them afterward with
            Super Admin's verified file upload.
          </DialogDescription>
        </DialogHeader>
        <NexusModBrowser installedNames={installedNames} />
      </DialogContent>
    </Dialog>
  );
}
