# TICKET-0163

**Status**

Closed

**Type**

Bug + Enhancement

**Priority**

Medium

**Created**

2026-07-17

---

## Description

Follow-up batch from live testing of TICKET-0162's University auto-completion:

1. World Settings' bottom Save bar is covered by the University tracker widget - add a Save Settings button in the page's top banner too.
2. Reorder Admin Basics: Stop the server first, then Start it (was Start-then-Stop). No auto-booting the real server to make "stop" reachable - it stays locked until the server is genuinely running, same as any other step.
3. Confetti + a congratulations message should show the next time a graduate visits `/university` after their most recent graduation, not only in the instant they clicked the completing action (most completions now happen on other pages, so the celebration was often never seen).
4. Missing spotlight: "Browse Nexus Mods" (Mods page) never glowed for the wishlist step.
5. Every "Add to Wishlist" button (Nexus browse dialog) should glow while wishlisting is the active step - stops automatically once the step completes (Mod Supervisor needs 2, Admin Basics needs 1).
6. Admin Basics' `wishlist_mod` step never had an auto-complete trigger wired at all - wishlisting a mod did nothing.
7. Move "Kick Captain Lamball" off the `/university` page onto a new fake "Training Roster" panel on Dashboard, styled like the real player roster, visible only while `kick_training` is the active step.

---

## Reason

Direct user feedback after testing TICKET-0162 live.

---

## Implementation Plan

* [x] WorldSettings.tsx: top Save Settings button.
* [x] university.py: reorder admin_basics steps (stop_server, start_server, ...); retarget kick_training's route to `/`.
* [x] University.tsx: celebrate-on-next-visit (localStorage-tracked per course graduatedAt), remove the inline kick button.
* [x] Mods.tsx: spotlight the Browse Nexus Mods button for wishlist_one/wishlist_mod.
* [x] NexusModCard.tsx: spotlight the Add to Wishlist button.
* [x] NexusModBrowser.tsx: wire wishlist_mod completion (1 mod, no popup) alongside the existing wishlist_one logic (2 mods, with popup).
* [x] New `components/dashboard/TrainingRoster.tsx` + wire into Dashboard.tsx.

---

## Files Modified

`app/services/university.py`, `web/src/pages/{WorldSettings,University,Mods,ServerControl,Dashboard}.tsx`, `web/src/components/mods/{NexusModCard,NexusModBrowser}.tsx`, new `web/src/components/dashboard/TrainingRoster.tsx`. Also fixed a pre-existing gap found along the way: `stop_server` never had an auto-complete trigger at all (wired into `ServerControl.tsx`'s `handleStop`, matching `start_server`'s existing pattern) - worth having regardless of the reorder, but became load-bearing once `stop_server` moved to the front of the sequence.

---

## Testing

Backend: full `pytest -v` (128 passed, no test asserted the old admin_basics step order) + `ruff check`/`format --check` clean. Frontend: `npm run typecheck`/`lint`/`format:check`/`build` clean. Manual click-through not possible in this sandbox - flagged for live verification on the user's server, especially the Training Roster and the wishlist-button glow across a full Nexus browse grid.

---

## Result

All 7 items landed in one commit on `main`. Combined with TICKET-0162's earlier fix (set_ports auto-complete, 5s polling), the full Super Admin/Mod Supervisor/Admin Basics chains should now be unstuck end to end.

---

## Notes

Did not add any code to auto-start the real Palworld server anywhere - `stop_server` being first in Admin Basics is expected to sit locked until the server is genuinely running, exactly like every other step's real-action-gated design.

---

## Closed

2026-07-17
