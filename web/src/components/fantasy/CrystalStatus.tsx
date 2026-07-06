import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ServerRunState } from "@/types/models";

interface CrystalStatusProps {
  state: ServerRunState;
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

const STATE_CONFIG: Record<
  ServerRunState,
  { core: string; halo: string; ring: string; text: string; pulse: boolean }
> = {
  online: {
    core: "from-life-300 via-life-500 to-life-600",
    halo: "bg-life-500/40",
    ring: "border-life-400/60",
    text: "text-life-400",
    pulse: true,
  },
  offline: {
    core: "from-stone-500 via-stone-600 to-stone-800",
    halo: "bg-stone-600/20",
    ring: "border-stone-500/50",
    text: "text-parchment-300/50",
    pulse: false,
  },
  starting: {
    core: "from-gold-300 via-gold-500 to-gold-600",
    halo: "bg-gold-500/40",
    ring: "border-gold-400/60",
    text: "text-gold-400",
    pulse: true,
  },
  stopping: {
    core: "from-gold-300 via-gold-500 to-blood-500",
    halo: "bg-gold-500/30",
    ring: "border-gold-400/50",
    text: "text-gold-400",
    pulse: true,
  },
  restarting: {
    core: "from-mana-300 via-mana-500 to-mana-600",
    halo: "bg-mana-500/40",
    ring: "border-mana-400/60",
    text: "text-mana-400",
    pulse: true,
  },
};

const SIZE_CONFIG = {
  sm: { orb: "h-6 w-6", halo: "h-8 w-8", text: "text-xs" },
  md: { orb: "h-10 w-10", halo: "h-14 w-14", text: "text-sm" },
  lg: { orb: "h-16 w-16", halo: "h-24 w-24", text: "text-base" },
};

export function CrystalStatus({ state, size = "md", label, className }: CrystalStatusProps) {
  const config = STATE_CONFIG[state];
  const dims = SIZE_CONFIG[size];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative flex shrink-0 items-center justify-center">
        <div
          className={cn(
            "absolute rounded-full blur-md",
            dims.halo,
            config.halo,
            config.pulse && "animate-glow-pulse"
          )}
        />
        <motion.div
          animate={config.pulse ? { rotate: 360 } : {}}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className={cn("relative rounded-full border-2 p-[3px]", dims.orb, config.ring)}
        >
          <div
            className={cn(
              "h-full w-full rounded-full bg-gradient-to-br shadow-inner",
              config.core
            )}
          />
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.55),transparent_55%)]" />
        </motion.div>
      </div>
      {label && (
        <div className="min-w-0">
          <p className={cn("font-display font-semibold capitalize", dims.text, config.text)}>{label}</p>
        </div>
      )}
    </div>
  );
}
