import { useTranslation } from "react-i18next";
import { RuneDialog } from "@/components/fantasy/RuneDialog";
import type { ServerUpdateCheck } from "@/types/models";

interface UpdateConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isOnline: boolean;
  updateCheck: ServerUpdateCheck | null;
  onConfirm: () => void;
  confirming: boolean;
}

export function UpdateConfirmDialog({ open, onOpenChange, isOnline, updateCheck, onConfirm, confirming }: UpdateConfirmDialogProps) {
  const { t } = useTranslation();
  return (
    <RuneDialog
      open={open}
      onOpenChange={onOpenChange}
      tone="warning"
      title={t("serverControl.updateDialog.title", { defaultValue: "Update server files?" })}
      description={
        isOnline
          ? t("serverControl.updateDialog.stoppedRequired", {
              defaultValue: "An update is available, but the server must be stopped before AutoPalExpress can update its files.",
            })
          : updateCheck?.latestBuildId
            ? t("serverControl.updateDialog.availableWithBuild", {
                defaultValue: "Steam reports a newer Palworld Dedicated Server build ({{buildId}}). Update the active server now?",
                buildId: updateCheck.latestBuildId,
              })
            : t("serverControl.updateDialog.available", {
                defaultValue: "Steam reports a newer Palworld Dedicated Server build. Update the active server now?",
              })
      }
      confirmLabel={t("serverControl.updateServer", { defaultValue: "Update Server" })}
      onConfirm={onConfirm}
      confirming={confirming}
    />
  );
}
