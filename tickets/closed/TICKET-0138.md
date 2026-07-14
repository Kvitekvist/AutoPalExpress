# TICKET-0138

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

Add the Space Invaders mini-game (TICKET-0135) to the Deploy New Server dialog's wait screen too, shown while a deployment is actively running (SteamCMD downloading the server), with a squid-pal-styled ship instead of the plain block used on the login-loading screen.

---

## Reason

Direct user request: "during the server deployment waiting, add a window to play space invaders while we wait for the deployment to finish. would be cool if the space ships looks like Killamari pals."

---

## Implementation Plan

* [x] Generalized `SpaceInvadersLoader.tsx` into `SpaceInvadersGame.tsx` (renamed - it's no longer specific to the login loading screen) with a `shipStyle?: "block" | "squid"` prop and an optional `caption` override, instead of duplicating the whole game engine for a second use site.
* [x] Added `drawSquidShip()` - a small, original, squid-pal-*inspired* ship (round mantle + trailing tentacles, purple tones) drawn entirely with canvas primitives, not a reproduction of any specific game's actual artwork (avoiding the IP concerns this project has been careful about elsewhere - e.g. TICKET-0027's Nexus Mods compliance work).
* [x] `web/src/hooks/useAuth.tsx`: updated the import/usage for the rename (`shipStyle` defaults to `"block"`, unchanged visual behavior).
* [x] `web/src/components/settings/DeployServerWizard.tsx`: shows `<SpaceInvadersGame shipStyle="squid" .../>` above the deploy log, only while `status === "running"` - disappears automatically once the deploy finishes (`done`/`error`), matching the same "just stops rendering" pattern as the login-loading version.

---

## Files Modified

* `web/src/components/fantasy/SpaceInvadersLoader.tsx` -> renamed `SpaceInvadersGame.tsx`
* `web/src/hooks/useAuth.tsx`
* `web/src/components/settings/DeployServerWizard.tsx`

---

## Testing

* `npx tsc --noEmit` - passes with no errors.
* `npm run build` - passes (the exact build step the packaged installer runs).
* Full rebuild via `scripts\build.bat` succeeded.
* Not visually confirmed in a real browser (no screenshot/visual-inspection tool available) - relied on the clean build plus direct code review of the rename/prop-threading and the new drawing function.

---

## Result

The Deploy New Server dialog shows a playable, squid-styled Space Invaders game while SteamCMD downloads the server, using the same reusable game component as the login screen's version.

---

## Notes

The ship is an original, simple canvas drawing evoking a squid-like pal, not an attempt to reproduce Killamari's actual in-game artwork - keeping with this project's established care around not reproducing copyrighted Palworld assets.

---

## Closed

2026-07-14
