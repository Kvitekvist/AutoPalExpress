import { universityApi } from "@/api";

/** Dispatched on `window` after any University progress change (activate,
 * complete a step, retake) so the floating tracker and any in-page prompts
 * refetch without prop-drilling or a shared store. */
export const UNIVERSITY_UPDATED = "university:updated";

/** Fire-and-forget completion for a University lesson: fetches the current
 * catalog fresh (avoids stale-closure races with whatever component last
 * rendered it), and only calls the real complete-step API if `stepId` is
 * genuinely the active course's current next (unlocked, uncompleted) step.
 * Silently no-ops otherwise - safe to call unconditionally from any action
 * handler across the app (e.g. ServerControl's Start button) without first
 * checking whether a course is even active, since `start_server` exists in
 * both the Super Admin and Admin Basics courses and only one is ever active
 * per user at a time. */
export async function completeQuestStep(stepId: string): Promise<void> {
  const catalog = await universityApi.getCatalog().catch(() => null);
  if (!catalog?.activeCourse) return;
  const active = catalog.courses.find((c) => c.id === catalog.activeCourse);
  const next = active?.steps.find((s) => !s.completed && !s.locked);
  if (!active || next?.id !== stepId) return;
  await universityApi.completeStep(active.id, stepId).catch(() => {});
  window.dispatchEvent(new Event(UNIVERSITY_UPDATED));
}
