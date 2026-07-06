import { cn } from "@/lib/utils";

interface ManaProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  valueLabel?: string;
  variant?: "gold" | "mana" | "life" | "blood" | "arcane";
  className?: string;
}

const VARIANT_GRADIENT: Record<string, string> = {
  gold: "from-gold-600 via-gold-400 to-gold-500",
  mana: "from-mana-600 via-mana-400 to-mana-500",
  life: "from-life-600 via-life-400 to-life-500",
  blood: "from-blood-600 via-blood-400 to-blood-500",
  arcane: "from-arcane-600 via-arcane-400 to-arcane-500",
};

const VARIANT_GLOW: Record<string, string> = {
  gold: "shadow-rune-gold",
  mana: "shadow-rune-mana",
  life: "shadow-rune-life",
  blood: "shadow-rune-blood",
  arcane: "shadow-[0_0_12px_2px_rgba(149,96,239,0.5)]",
};

export function ManaProgressBar({
  value,
  max = 100,
  label,
  valueLabel,
  variant = "mana",
  className,
}: ManaProgressBarProps) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div className={cn("w-full", className)}>
      {(label || valueLabel) && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          {label && <span className="font-medium text-parchment-300/70">{label}</span>}
          {valueLabel && <span className="font-mono text-parchment-200">{valueLabel}</span>}
        </div>
      )}
      <div className="relative h-2.5 w-full overflow-hidden rounded-full border border-stone-700 bg-stone-900">
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r transition-[width] duration-700 ease-out",
            VARIANT_GRADIENT[variant],
            percent > 4 && VARIANT_GLOW[variant]
          )}
          style={{ width: `${percent}%` }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_40%,rgba(255,255,255,0.25)_50%,transparent_60%)] bg-[length:250%_100%] animate-shimmer" />
      </div>
    </div>
  );
}
