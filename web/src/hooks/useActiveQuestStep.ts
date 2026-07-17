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
    // Also polls: some completions (create_server) are purely backend-
    // computed from real app state with no single frontend action to hang
    // an UNIVERSITY_UPDATED dispatch off of, so relying on the event alone
    // left the tracker/spotlights showing stale "not done yet" state until
    // something unrelated happened to trigger a refetch.
    const timer = window.setInterval(refresh, 5000);
    return () => {
      window.removeEventListener(UNIVERSITY_UPDATED, refresh);
      window.clearInterval(timer);
    };
  }, [refresh]);

  const activeCourse = catalog?.courses.find((c) => c.id === catalog.activeCourse) ?? null;
  const nextStep = activeCourse?.steps.find((s) => !s.completed && !s.locked) ?? null;

  return { catalog, activeCourse, nextStep };
}
