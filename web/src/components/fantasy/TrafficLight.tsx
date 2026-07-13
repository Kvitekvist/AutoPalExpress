import { cn } from "@/lib/utils";

export type TrafficLightColor = "grey" | "yellow" | "red" | "green";

const COLOR_CLASSES: Record<TrafficLightColor, string> = {
  grey: "bg-stone-500",
  yellow: "bg-gold-400 shadow-[0_0_6px_2px_rgba(212,175,55,0.5)]",
  red: "bg-blood-500 shadow-[0_0_6px_2px_rgba(225,75,66,0.5)]",
  green: "bg-life-400 shadow-[0_0_6px_2px_rgba(79,206,124,0.5)]",
};

interface TrafficLightProps {
  label: string;
  // null means "still loading" - shown as a dim pulsing dot, distinct from
  // the real "grey" (off/not applicable) state.
  color: TrafficLightColor | null;
  hint?: string;
}

export function TrafficLight({ label, color, hint }: TrafficLightProps) {
  return (
    <div className="flex items-center gap-2" title={hint}>
      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", color ? COLOR_CLASSES[color] : "animate-pulse bg-stone-600")} />
      <span className="text-xs text-parchment-300/70">{label}</span>
    </div>
  );
}
