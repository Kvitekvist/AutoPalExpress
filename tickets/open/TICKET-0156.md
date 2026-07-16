# TICKET-0156

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

Reduce frontend/backend maintenance hotspots, without changing behavior:

* `app/services/palworld_settings.py` (989 lines) mixes the generic `.ini` engine with ~360 lines of pure field metadata.
* `app/routes/mods.py` (594 lines) mixes route handlers with Nexus-download and manual-upload-verification business logic that belongs in services.
* `web/src/pages/ServerControl.tsx` (595 lines) owns status display, 6 action handlers, an update-job poller, a countdown timer, and 3 dialogs in one component.
* `web/dist/assets/index-*.js` is a single 1.09 MB bundle - no route-level code splitting.
* No formatting/lint gate for the Python backend, no explicit frontend type-check CI step.

---

## Reason

Direct user request: "Several modules are becoming expensive to change... Split settings metadata into data files, separate Nexus/manual mod routes and services, decompose Server Control, lazy-load pages, and establish formatting/type/lint gates. keep it modular and stable above all." Plan reviewed and approved before implementation (see `.claude/plans/floating-foraging-meerkat.md`).

---

## Implementation Plan

* [ ] Slice 1: Extract `palworld_settings.py`'s field metadata into `app/services/palworld_settings_data.py`.
* [ ] Slice 2: Convert `app/routes/mods.py` into a package (`wishlist.py`/`crud.py`/`nexus.py`/`manual.py`/`_shared.py`), extract `app/services/nexus_mod_service.py` and `app/services/manual_mod_service.py`.
* [ ] Slice 3: Decompose `ServerControl.tsx` into `web/src/components/serverControl/*` plus `useShutdownCountdown`/`useServerUpdateJob` hooks.
* [ ] Slice 4: Lazy-load routed pages in `App.tsx` via `React.lazy`/`Suspense`.
* [ ] Slice 5: Add `ruff` (backend) and `prettier` (frontend) formatting/lint, an explicit `typecheck` script, and wire all of it into CI.

---

## Files Modified

Tracked per-slice below as implementation proceeds.

---

## Testing

Backend: `pytest -v` after slices 1-2 and 5. Frontend: `npm run build` after slices 3-4, plus manual click-through of Server Control (start/stop/restart/save/broadcast/shutdown countdown/update check) and every nav item (lazy-loading regression check).

---

## Notes

Pure structural refactor - every extracted piece keeps its exact existing logic; only its location changes. No route paths, response shapes, or UI behavior change. `WorldSettings.tsx`/`LauncherFlags.tsx` deliberately out of scope (not named by the user, more cohesive single-purpose pages).
