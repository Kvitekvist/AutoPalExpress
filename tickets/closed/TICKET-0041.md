# TICKET-0041

**Status**

Closed

**Type**

Bug / Enhancement

**Priority**

High

**Created**

2026-07-09

---

## Description

Follow up on the latest installed build: Nexus Browse only visibly offered Install File, the sidebar launch page needed to be named Launcher Options with the exact requested flags, duplicate server-instance records could still survive in some registries, and server instance rows needed a clearer local file-browse action.

---

## Reason

The direct Nexus install path was present but hidden unless the app already saw a saved Premium Nexus key. That made the feature look missing on fresh installs. Launcher flags were grouped under older wording and one combined performance toggle instead of exposing each Palworld argument separately. Server instance cleanup also needed stronger path normalization and clearer UI wording.

---

## Implementation Plan

* [x] Keep direct Nexus installs Premium-gated, but show Direct Install on mod cards with a clear unavailable reason when the saved key is missing or non-Premium.

* [x] Rename the sidebar item to Launcher Options and expose individual toggles for `-useperfthreads`, `-NoAsyncLoadingThread`, `-UseMultithreadForDS`, and `-publiclobby`.

* [x] Split stored launch-option state into per-argument booleans while migrating older combined `performanceFlags` records.

* [x] Strengthen server-instance dedupe with canonical path storage and duplicate-prevention for same-folder creates.

* [x] Rename the instance folder action to Browse Files.

* [x] Update documentation and verify backend/frontend builds.

---

## Files Modified

* `app/services/instance_store.py`
* `app/routes/instances.py`
* `app/services/process_manager.py`
* `web/src/api/instancesApi.ts`
* `web/src/types/models.ts`
* `web/src/pages/LauncherFlags.tsx`
* `web/src/components/layout/Sidebar.tsx`
* `web/src/App.tsx`
* `web/src/components/mods/NexusModBrowser.tsx`
* `web/src/components/mods/NexusModCard.tsx`
* `web/src/components/settings/InstanceManagerPanel.tsx`
* `README.md`
* `CHANGELOG.md`
* `.claude/memory/project_memory.md`
* `.claude/memory/architecture.md`
* `.claude/memory/decisions.md`
* `.claude/memory/ticket_memory.md`

---

## Testing

* Passed: `.venv312\Scripts\python.exe -m py_compile app\services\instance_store.py app\routes\instances.py app\services\process_manager.py app\routes\mods.py app\services\nexus_session.py`
* Passed: `npm.cmd run build`
* Note: Vite still reports the existing large-chunk warning after a successful build.

---

## Result

Nexus Browse now keeps Direct Install visible for super admins and explains when a saved Premium Nexus key is needed. Launcher Options is the sidebar label and contains separate toggles for `-useperfthreads`, `-NoAsyncLoadingThread`, `-UseMultithreadForDS`, and `-publiclobby`. Server instance records are canonicalized during dedupe, same-folder creates reuse the existing record, and the instance row action is labeled Browse Files.

---

## Closed

2026-07-09
