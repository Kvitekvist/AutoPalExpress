import * as React from "react";
import { universityApi } from "@/api";
import { UNIVERSITY_UPDATED } from "@/lib/questCompletion";
import type { UniversityCatalog, UniversityCourse, UniversityStep } from "@/types/models";

/** Shared read side for the active course/step - used by the floating quest
 * tracker, QuestSpotlight, and inline in-page prompts so they all agree on
 * "what's next" without each fetching and computing it independently. */
export function useActiveQuestStep(): {
  catalog: UniversityCatalog | null;
  activeCourse: UniversityCourse | null;
  nextStep: UniversityStep | null;
} {
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

  const activeCourse = catalog?.courses.find((c) => c.id === catalog.activeCourse) ?? null;
  const nextStep = activeCourse?.steps.find((s) => !s.completed && !s.locked) ?? null;

  return { catalog, activeCourse, nextStep };
}
