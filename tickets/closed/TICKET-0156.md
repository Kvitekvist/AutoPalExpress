# TICKET-0156

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

* [x] Slice 1: Extract `palworld_settings.py`'s field metadata into `app/services/palworld_settings_data.py`.
* [x] Slice 2: Convert `app/routes/mods.py` into a package (`wishlist.py`/`crud.py`/`nexus.py`/`manual.py`/`_shared.py`), extract `app/services/nexus_mod_service.py` and `app/services/manual_mod_service.py`.
* [x] Slice 3: Decompose `ServerControl.tsx` into `web/src/components/serverControl/*` plus `useShutdownCountdown`/`useServerUpdateJob` hooks.
* [x] Slice 4: Lazy-load routed pages in `App.tsx` via `React.lazy`/`Suspense`.
* [x] Slice 5: Add `ruff` (backend) and `prettier` (frontend) formatting/lint, an explicit `typecheck` script, and wire all of it into CI.

---

## Files Modified

**Slice 1:** new `app/services/palworld_settings_data.py`; `app/services/palworld_settings.py` trimmed from 989 to ~385 lines.

**Slice 2:** deleted `app/routes/mods.py` (594 lines); new `app/routes/mods/{__init__,_shared,wishlist,crud,nexus,manual}.py` and `app/services/{nexus_mod_service,manual_mod_service,mods_shared}.py`.

**Slice 3:** `web/src/pages/ServerControl.tsx` (595 -> ~305 lines); new `web/src/components/serverControl/{StartServerControl,ActionButton,BroadcastDialog,ShutdownCountdownDialog,UpdateConfirmDialog,ServerUpdateProgressPanel}.tsx` and `web/src/hooks/{useShutdownCountdown,useServerUpdateJob}.ts`.

**Slice 4:** `web/src/App.tsx` (React.lazy/Suspense for every routed page except Dashboard).

**Slice 5:** new `ruff.toml`, `web/.prettierrc.json`, `web/.prettierignore`; `requirements-dev.txt`, `web/package.json` (new `typecheck`/`format`/`format:check` scripts), `.github/workflows/ci.yml` (new `backend-lint` job, new `frontend` job steps); mechanical `ruff format`/`prettier --write` pass across the existing codebase plus a handful of pre-existing lint findings fixed (unused imports, import ordering, one unused test variable).

---

## Testing

Backend: full pytest suite (120 tests) green after every slice; `ruff check .`/`ruff format --check .` clean. Frontend: `npm run typecheck`/`npm run lint`/`npm run format:check`/`npm run build` all clean after every slice; verified the mods route table (17 routes) matches the original exactly; verified the main JS bundle dropped from ~1.10 MB to ~712 KB with per-page chunks (8-40 KB) after Slice 4. Manual UI click-through (Server Control actions, nav click-through) deliberately not done - this sandbox can't drive an interactive browser session, same limitation noted throughout this project's history (TICKET-0018/0062/0066/etc.).

---

## Result

All 5 slices landed as separate commits on `main`, verified independently. No route paths, response shapes, or UI behavior changed - confirmed via the full test suite plus a direct route-table dump for the mods split. `LOCAL_API_SETTING_KEYS` re-export regression (introduced transiently by ruff's autofix mid-slice-5) was caught and fixed before committing. A concurrent-session branch mixup mid-ticket (see `.claude/memory/project_memory.md`'s TICKET-0156 entry) was resolved non-destructively with the user's confirmation.

---

## Notes

Pure structural refactor - every extracted piece keeps its exact existing logic; only its location changes. `WorldSettings.tsx`/`LauncherFlags.tsx` deliberately out of scope (not named by the user, more cohesive single-purpose pages).

---

## Closed

2026-07-16
