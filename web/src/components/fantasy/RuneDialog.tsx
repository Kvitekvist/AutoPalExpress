import * as React from "react";
import { TriangleAlert, ShieldQuestion, Skull } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { cn } from "@/lib/utils";

export type RuneDialogTone = "danger" | "warning" | "info";

interface RuneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  tone?: RuneDialogTone;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  confirming?: boolean;
  children?: React.ReactNode;
}

const TONE_CONFIG: Record<RuneDialogTone, { icon: typeof Skull; color: string; ring: string; variant: "danger" | "gold" | "mana" }> = {
  danger: { icon: Skull, color: "text-blood-400", ring: "border-blood-500/40 bg-blood-500/10", variant: "danger" },
  warning: { icon: TriangleAlert, color: "text-gold-400", ring: "border-gold-500/40 bg-gold-500/10", variant: "gold" },
  info: { icon: ShieldQuestion, color: "text-mana-400", ring: "border-mana-500/40 bg-mana-500/10", variant: "mana" },
};

export function RuneDialog({
  open,
  onOpenChange,
  title,
  description,
  tone = "warning",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  confirming,
  children,
}: RuneDialogProps) {
  const config = TONE_CONFIG[tone];
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-1 flex items-center gap-3">
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full border", config.ring)}>
              <Icon className={cn("h-5 w-5", config.color)} />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        <DialogFooter>
          <RuneButton variant="ghost" onClick={() => onOpenChange(false)} disabled={confirming}>
            {cancelLabel}
          </RuneButton>
          <RuneButton variant={config.variant} onClick={onConfirm} disabled={confirming}>
            {confirming ? "Working..." : confirmLabel}
          </RuneButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
