import * as React from "react";
import { useActiveQuestStep } from "@/hooks/useActiveQuestStep";
import { cn } from "@/lib/utils";

/** Wraps a control with a pulsing gold highlight while it's the active
 * University course's current step - a visual "interact here" cue instead of
 * only ever describing the step in prose on the /university page. Renders
 * children unmodified when this isn't the current step. */
export function QuestSpotlight({
  stepId,
  children,
  className,
}: {
  /** A single step id, or several - useful when one physical control
   * completes different steps depending on which course is active (e.g.
   * installing UE4SS satisfies both Super Admin's "mods_choice" and Mod
   * Supervisor's "install_ue4ss"). */
  stepId: string | string[];
  children: React.ReactNode;
  className?: string;
}) {
  const { nextStep } = useActiveQuestStep();
  const ids = Array.isArray(stepId) ? stepId : [stepId];
  const active = !!nextStep && ids.includes(nextStep.id);

  return (
    <div className={cn("relative", className)}>
      {active && (
        <div className="pointer-events-none absolute -inset-1.5 z-10 rounded-lg border-2 border-gold-400/80 shadow-[0_0_16px_rgba(223,177,90,0.55)] animate-glow-pulse" />
      )}
      {children}
    </div>
  );
}
