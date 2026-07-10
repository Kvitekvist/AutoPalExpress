import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { NexusModBrowser } from "@/components/mods/NexusModBrowser";
import type { Mod } from "@/types/models";

interface NexusBrowseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  installedNames: string[];
  onModsChanged: (mods: Mod[]) => void;
}

export function NexusBrowseDialog({ open, onOpenChange, installedNames, onModsChanged }: NexusBrowseDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("mods.nexusBrowse.title", { defaultValue: "Browse Nexus Mods" })}</DialogTitle>
          <DialogDescription>
            {t("mods.nexusBrowse.description", {
              defaultValue:
                "Search and filter Palworld mods from Nexus Mods. Super admins with Nexus Premium can install directly; everyone can still open Nexus and use verified file upload.",
            })}
          </DialogDescription>
        </DialogHeader>
        <NexusModBrowser installedNames={installedNames} onModsChanged={onModsChanged} />
      </DialogContent>
    </Dialog>
  );
}
