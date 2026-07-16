import * as React from "react";
import { GraduationCap, ChevronRight, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { universityApi } from "@/api";
import type { UniversityCatalog } from "@/types/models";

export const UNIVERSITY_UPDATED = "university:updated";

export function UniversityQuestTracker() {
  const navigate = useNavigate();
  const [catalog, setCatalog] = React.useState<UniversityCatalog | null>(null);

  const refresh = React.useCallback(
    () =>
      universityApi
        .getCatalog()
        .then(setCatalog)
        .catch(() => {}),
    []
  );
  React.useEffect(() => {
    refresh();
    window.addEventListener(UNIVERSITY_UPDATED, refresh);
    return () => window.removeEventListener(UNIVERSITY_UPDATED, refresh);
  }, [refresh]);

  const course = catalog?.courses.find((item) => item.id === catalog.activeCourse);
  if (!course) return null;
  const next = course.steps.find((step) => !step.completed);
  const done = course.steps.filter((step) => step.completed).length;

  return (
    <button
      onClick={() => navigate("/university")}
      className="fixed bottom-5 right-5 z-40 w-80 rounded-lg border border-gold-500/50 bg-gradient-to-br from-stone-800 to-abyss-950 p-4 text-left shadow-[0_0_30px_rgba(223,177,90,0.18)] transition hover:border-gold-300"
    >
      <div className="mb-2 flex items-center justify-between text-gold-300">
        <span className="flex items-center gap-2 font-display text-sm font-bold">
          <GraduationCap className="h-4 w-4" /> APE University
        </span>
        <span className="text-xs text-parchment-300/60">
          {done}/{course.steps.length}
        </span>
      </div>
      <p className="text-xs uppercase tracking-wider text-gold-200/60">{course.shortTitle}</p>
      <div className="mt-2 flex items-center gap-2 text-sm text-parchment-100">
        {next ? <ChevronRight className="h-4 w-4 text-gold-400" /> : <CheckCircle2 className="h-4 w-4 text-life-400" />}
        <span>{next?.title ?? "Degree complete"}</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-700">
        <div
          className="h-full bg-gradient-to-r from-gold-600 to-gold-300"
          style={{ width: `${(done / course.steps.length) * 100}%` }}
        />
      </div>
    </button>
  );
}
