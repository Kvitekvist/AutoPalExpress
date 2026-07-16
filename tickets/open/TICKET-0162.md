# TICKET-0162

**Status**

Open

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

* [ ] Chunk 1: Core plumbing - `useActiveQuestStep` hook, `completeQuestStep` helper, `QuestSpotlight` component, tracker manual-confirm button.
* [ ] Chunk 2: Course content changes - descriptions, Mod Supervisor step restructure, retake endpoint/button, admin-basics-status endpoint.
* [ ] Chunk 3: Super Admin degree auto-completion wiring (all 9 steps).
* [ ] Chunk 4: Mod Supervisor degree auto-completion wiring (all 5 restructured steps).
* [ ] Chunk 5: Allow Mods toggle (Mods page) + admin-basics visibility (Users & Access panel).

---

## Files Modified

Tracked per-chunk below as implementation proceeds.

---

## Testing

Backend: `pytest -v` + `ruff check`/`format --check` after chunks 2-5. Frontend: `npm run typecheck`/`lint`/`format:check`/`build` after every chunk. Manual click-through not possible in this sandbox (no interactive browser) - flagged for live verification, especially the spotlight visuals and network-panel auto-completion cascade.

---

## Notes

Per-user progress isolation was already correct in the existing `university.py` (storage keyed by `user["id"]`) - verified, not changed. Mod Supervisor's old `wishlist_two`/`approve_two` steps are removed outright (pre-release feature, no real users through it yet, no migration needed).
