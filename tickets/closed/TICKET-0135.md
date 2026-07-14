# TICKET-0135

**Status**

Closed

**Type**

Feature

**Priority**

Low

**Created**

2026-07-14

---

## Description

Replace the plain "Awakening the realm..." pulsing text shown during the app's initial auth-status check (`useAuth.tsx`'s `phase === "loading"` branch) with a small, self-contained, playable Space Invaders mini-game - arrow keys to move, Space to shoot, an endless wave that resets itself rather than a scored "game over" (since this is just a loading-screen flourish, not a real game mode). It naturally disappears the moment the auth check resolves and a real screen (Setup/Login/authed shell) takes over, since that's just React unmounting the loading branch as usual - no separate "hide the game" logic needed.

---

## Reason

Direct user request: "before any text is showed loading, can you add space invaders mini game in the window that disapairs when the first message text show up" - a fun easter egg for what's normally a very brief loading window.

---

## Implementation Plan

* [x] New `web/src/components/fantasy/SpaceInvadersLoader.tsx` - HTML5 canvas, `requestAnimationFrame` game loop, keyboard-driven player movement/shooting, simple invader wave with edge-bounce-and-descend behavior, endless (auto-resets on wipe or reaching the bottom rather than ending).
* [x] `web/src/hooks/useAuth.tsx`: loading-phase branch now renders `<SpaceInvadersLoader />` instead of the plain pulsing text.
* [x] Verified with `npx tsc --noEmit` and a full `npm run build` (the same build path the packaged installer uses) - caught and fixed a real TS strictness gap along the way: `tsc --noEmit` alone didn't flag it, but `tsc -b` (project build mode) correctly does, since type narrowing on the canvas 2D context doesn't propagate into the nested `tick` closure - fixed with an explicit `const ctx: CanvasRenderingContext2D = context` annotation right after the null check.

---

## Files Modified

* `web/src/components/fantasy/SpaceInvadersLoader.tsx` (new)
* `web/src/hooks/useAuth.tsx`

---

## Testing

* `npx tsc --noEmit` - passes.
* `npm run build` - passes (this is the exact build step the packaged installer's `scripts\build.bat` runs, so it's confirmed to work in the real packaged app too, not just dev mode).
* Not visually confirmed in a real browser (no screenshot/visual-inspection tool available in this environment) - relying on the clean build plus direct code review of the game loop, event listener cleanup, and canvas drawing logic.

---

## Notes

No game-over/scoring state on purpose - it's meant to be a delightful distraction during a loading wait, not a real mode with its own UX to design (pause states, high scores, etc.) that would be effort disproportionate to how long the loading screen is normally visible.

---

## Closed

2026-07-14
