import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { cn } from "@/lib/utils";

export const COUNTDOWN_PRESETS = [30, 60, 120, 300];

interface ShutdownCountdownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seconds: number;
  onSecondsChange: (seconds: number) => void;
  onBegin: () => void;
}

export function ShutdownCountdownDialog({ open, onOpenChange, seconds, onSecondsChange, onBegin }: ShutdownCountdownDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("serverControl.shutdownDialog.title", { defaultValue: "Begin Shutdown Countdown" })}</DialogTitle>
          <DialogDescription>
            {t("serverControl.shutdownDialog.description", {
              defaultValue: "Choose how long until the server shuts down. Players will remain connected until the countdown ends.",
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {COUNTDOWN_PRESETS.map((s) => (
            <button
              key={s}
              onClick={() => onSecondsChange(s)}
              className={cn(
                "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
                seconds === s
                  ? "border-blood-500/60 bg-blood-500/10 text-blood-400"
                  : "border-stone-600 text-parchment-300/60 hover:border-blood-500/40"
              )}
            >
              {s < 60 ? `${s}s` : `${s / 60}m`}
            </button>
          ))}
        </div>
        <DialogFooter>
          <RuneButton variant="ghost" onClick={() => onOpenChange(false)}>
            {t("serverControl.cancel", { defaultValue: "Cancel" })}
          </RuneButton>
          <RuneButton variant="danger" onClick={onBegin}>
            {t("serverControl.shutdownDialog.begin", { defaultValue: "Begin Countdown" })}
          </RuneButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
