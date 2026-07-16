import { GraduationCap, ChevronRight, CheckCircle2, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useActiveQuestStep } from "@/hooks/useActiveQuestStep";
import { completeQuestStep, UNIVERSITY_UPDATED } from "@/lib/questCompletion";

export { UNIVERSITY_UPDATED };

export function UniversityQuestTracker() {
  const navigate = useNavigate();
  const { activeCourse, nextStep } = useActiveQuestStep();

  if (!activeCourse) return null;
  const done = activeCourse.steps.filter((step) => step.completed).length;

  return (
    <div className="fixed bottom-5 right-5 z-40 w-80 rounded-lg border border-gold-500/50 bg-gradient-to-br from-stone-800 to-abyss-950 p-4 text-left shadow-[0_0_30px_rgba(223,177,90,0.18)] transition hover:border-gold-300">
      <button onClick={() => navigate("/university")} className="w-full text-left">
        <div className="mb-2 flex items-center justify-between text-gold-300">
          <span className="flex items-center gap-2 font-display text-sm font-bold">
            <GraduationCap className="h-4 w-4" /> APE University
          </span>
          <span className="text-xs text-parchment-300/60">
            {done}/{activeCourse.steps.length}
          </span>
        </div>
        <p className="text-xs uppercase tracking-wider text-gold-200/60">{activeCourse.shortTitle}</p>
        <div className="mt-2 flex items-center gap-2 text-sm text-parchment-100">
          {nextStep ? (
            <ChevronRight className="h-4 w-4 text-gold-400" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-life-400" />
          )}
          <span>{nextStep?.title ?? "Degree complete"}</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-700">
          <div
            className="h-full bg-gradient-to-r from-gold-600 to-gold-300"
            style={{ width: `${(done / activeCourse.steps.length) * 100}%` }}
          />
        </div>
      </button>
      {nextStep && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            completeQuestStep(nextStep.id);
          }}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-gold-600/40 bg-gold-500/5 px-2 py-1.5 text-xs font-medium text-gold-300 transition-colors hover:border-gold-400 hover:bg-gold-500/10"
        >
          <Check className="h-3.5 w-3.5" /> Mark this step done
        </button>
      )}
    </div>
  );
}
