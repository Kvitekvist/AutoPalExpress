import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, TriangleAlert, Skull, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppNotification, NotificationKind } from "@/types/models";

const KIND_CONFIG: Record<
  NotificationKind,
  { icon: typeof CheckCircle2; ring: string; glow: string; iconColor: string; label: string }
> = {
  success: {
    icon: CheckCircle2,
    ring: "border-life-500/50",
    glow: "shadow-[0_0_24px_-2px_rgba(79,206,124,0.55)]",
    iconColor: "text-life-400",
    label: "Blessing",
  },
  info: {
    icon: Info,
    ring: "border-mana-500/50",
    glow: "shadow-[0_0_24px_-2px_rgba(91,184,232,0.5)]",
    iconColor: "text-mana-400",
    label: "Whisper",
  },
  warning: {
    icon: TriangleAlert,
    ring: "border-gold-500/50",
    glow: "shadow-[0_0_24px_-2px_rgba(223,177,90,0.55)]",
    iconColor: "text-gold-400",
    label: "Omen",
  },
  error: {
    icon: Skull,
    ring: "border-blood-500/60",
    glow: "shadow-[0_0_24px_-2px_rgba(225,75,66,0.6)]",
    iconColor: "text-blood-400",
    label: "Curse",
  },
};

interface MagicNotificationStackProps {
  items: AppNotification[];
  onDismiss: (id: string) => void;
}

export function MagicNotificationStack({ items, onDismiss }: MagicNotificationStackProps) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3">
      <AnimatePresence initial={false}>
        {items.map((item) => {
          const config = KIND_CONFIG[item.kind];
          const Icon = config.icon;
          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.9, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className={cn(
                "pointer-events-auto relative overflow-hidden rounded-lg border bg-abyss-900/95 bg-noise p-3.5 pr-9 backdrop-blur-sm",
                config.ring,
                config.glow
              )}
            >
              <div
                className={cn(
                  "absolute inset-x-0 top-0 h-[2px] animate-shimmer bg-[length:200%_100%]",
                  item.kind === "success" && "bg-gradient-to-r from-transparent via-life-400 to-transparent",
                  item.kind === "info" && "bg-gradient-to-r from-transparent via-mana-400 to-transparent",
                  item.kind === "warning" && "bg-gradient-to-r from-transparent via-gold-400 to-transparent",
                  item.kind === "error" && "bg-gradient-to-r from-transparent via-blood-400 to-transparent"
                )}
              />
              <div className="flex items-start gap-3">
                <span className={cn("mt-0.5 shrink-0 animate-glow-pulse", config.iconColor)}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-parchment-300/50">
                    {config.label}
                  </p>
                  <p className="truncate font-display text-sm font-semibold text-parchment-100">{item.title}</p>
                  {item.message && <p className="mt-0.5 text-xs leading-snug text-parchment-300/70">{item.message}</p>}
                </div>
              </div>
              <button
                onClick={() => onDismiss(item.id)}
                className="absolute right-2 top-2 rounded-sm p-1 text-parchment-300/40 transition-colors hover:text-parchment-100"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
