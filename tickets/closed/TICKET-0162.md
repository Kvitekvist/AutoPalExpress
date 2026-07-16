# TICKET-0162

**Status**

Closed

**Type**

Enhancement

**Priority**

Medium

**Created**

2026-07-16

---

## Description

Upgrade APE University's tutorial UX: pulsing spotlight highlights on the control a step wants the user to interact with, auto-completion of most steps based on real actions elsewhere in the app instead of a manual "I completed this" click, a retake option, per-course descriptions, a restructured (7->5 step) Mod Supervisor course, a new "Allow Mods" toggle on the Mods page synced with World Settings' `bAllowClientMod`, and a super-admin-only view of which admins have graduated Admin Basics.

---

## Reason

Direct, detailed user request covering nearly every step of the Super Admin and Mod Supervisor courses (auto-complete conditions per step, a popup nudge, a retake button) plus a general request for pulsing highlights, per-course blurbs, and admin-basics visibility for the super admin. Plan reviewed and approved before implementation (see `.claude/plans/floating-foraging-meerkat.md`).

---

## Implementation Plan

* [x] Chunk 1: Core plumbing - `useActiveQuestStep` hook, `completeQuestStep` helper, `QuestSpotlight` component, tracker manual-confirm button.
* [x] Chunk 2: Course content changes - descriptions, Mod Supervisor step restructure, retake endpoint/button, admin-basics-status endpoint.
* [x] Chunk 3: Super Admin degree auto-completion wiring (all 9 steps).
* [x] Chunk 4: Mod Supervisor degree auto-completion wiring (all 5 restructured steps).
* [x] Chunk 5: Allow Mods toggle (Mods page) + admin-basics visibility (Users & Access panel).

---

## Files Modified

**Chunk 1:** new `web/src/lib/questCompletion.ts`, `web/src/hooks/useActiveQuestStep.ts`, `web/src/components/university/QuestSpotlight.tsx`; `UniversityQuestTracker.tsx` refactored to use the hook + manual-confirm button.

**Chunk 2:** `app/services/university.py` (descriptions, Mod Supervisor 7->5 steps, `retake()`, `admin_basics_status()`, `create_server` auto-complete), `app/routes/university.py` (new routes), `tests/test_university.py` (+8 tests), `web/src/api/universityApi.ts`, `web/src/types/models.ts`, `web/src/pages/University.tsx` (descriptions, Retake button).

**Chunk 3:** `ServerControl.tsx`, `LauncherFlags.tsx`, `AutomationPanel.tsx`, `PortForwardPanel.tsx`, `RemoteAccessPanel.tsx` (+ new `web/src/lib/networkQuestProgress.ts`), `Ue4ssPanel.tsx` (+ `QuestSpotlight` generalized to accept multiple step ids).

**Chunk 4:** `NexusModBrowser.tsx`, `ModWishlistPanel.tsx`, `Mods.tsx` (reorder/disable_all).

**Chunk 5:** `Mods.tsx` (Allow Mods toggle), `UsersPanel.tsx` (Admin Basics status badge).

---

## Testing

Backend: full `pytest -v` (128 tests, +8 new) and `ruff check`/`format --check` clean after every backend-touching chunk. Frontend: `npm run typecheck`/`lint`/`format:check`/`build` clean after every chunk. Manual click-through not possible in this sandbox (no interactive browser) - flagged for the user to verify live, especially the spotlight visuals and the network-panel auto-completion cascade (forward_ports chaining into firewall).

---

## Result

All 5 chunks landed as separate commits on `main`. `completeQuestStep` and `QuestSpotlight` are course-agnostic and reusable, so future steps/courses can hook into the same auto-completion pattern without new plumbing. Per-user progress isolation was verified already correct (no code change needed); the new admin-basics-status endpoint is the one deliberate super-admin-only exception, exposing graduation status only, not step detail.

---

## Notes

Mod Supervisor's old `wishlist_two`/`approve_two` steps were removed outright (pre-release feature, no real users through it yet, no migration path built). University's UI strings remain English-only, matching the pre-existing precedent set by TICKET-0157/0158/0159 (the whole feature was never run through this app's otherwise-thorough i18n system) - not a new inconsistency introduced here.

---

## Closed

2026-07-16
