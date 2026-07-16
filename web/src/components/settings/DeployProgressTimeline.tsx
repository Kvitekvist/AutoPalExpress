import { Check, Circle, LoaderCircle, X } from "lucide-react";
import type { DeployPhase } from "@/types/models";

const STYLE = {
  done: { icon: Check, ring: "border-life-500/60 bg-life-500/15 text-life-400", text: "text-life-300" },
  active: { icon: LoaderCircle, ring: "border-gold-400 bg-gold-500/15 text-gold-300 shadow-rune-gold", text: "text-gold-200" },
  error: { icon: X, ring: "border-blood-500/70 bg-blood-500/15 text-blood-400", text: "text-blood-300" },
  pending: { icon: Circle, ring: "border-stone-600 bg-stone-800/60 text-stone-500", text: "text-parchment-300/35" },
} as const;

export function DeployProgressTimeline({ phases }: { phases: DeployPhase[] }) {
  return <ol className="rounded-lg border border-stone-700/80 bg-abyss-950/35 px-4 py-3">
    {phases.map((phase, index) => {
      const style = STYLE[phase.status];
      const Icon = style.icon;
      return <li key={phase.id} className="relative flex min-h-11 items-center gap-3">
        {index < phases.length - 1 && <span className={`absolute left-[15px] top-8 h-[calc(100%-20px)] w-px ${phase.status === "done" ? "bg-life-500/45" : "bg-stone-700"}`} />}
        <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${style.ring}`}>
          <Icon className={`h-4 w-4 ${phase.status === "active" ? "animate-spin" : ""}`} />
        </span>
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
          <span className={`font-display text-sm ${style.text}`}>{phase.label}</span>
          <span className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${style.text}`}>
            {phase.status === "done" ? "Complete" : phase.status === "active" ? "Processing" : phase.status === "error" ? "Failed" : "Waiting"}
          </span>
        </div>
      </li>;
    })}
  </ol>;
}
