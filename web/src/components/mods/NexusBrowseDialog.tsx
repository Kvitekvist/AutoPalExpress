import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { NexusModBrowser } from "@/components/mods/NexusModBrowser";

interface NexusBrowseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  installedNames: string[];
}

export function NexusBrowseDialog({ open, onOpenChange, installedNames }: NexusBrowseDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("mods.nexusBrowse.title", { defaultValue: "Browse Nexus Mods" })}</DialogTitle>
          <DialogDescription>
            {t("mods.nexusBrowse.description", {
              defaultValue: "Search Palworld mods from Nexus Mods and add any of them to the server wishlist for the super admin to review.",
            })}
          </DialogDescription>
        </DialogHeader>
        <NexusModBrowser installedNames={installedNames} />
      </DialogContent>
    </Dialog>
  );
}
