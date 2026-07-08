# TICKET-0033

**Status**

Closed

**Type**

Feature

**Priority**

Medium

**Created**

2026-07-08

---

## Description

Add more Palworld launch-argument controls on the Settings page without duplicating settings that already have a single source of truth elsewhere in AutoPalExpress.

---

## Reason

Palworld documents several startup arguments that hosts may otherwise remember from SteamCMD/manual hosting. AutoPalExpress owns the server launch command, so safe launch-only options should be visible in the app instead of requiring manual edits.

---

## Implementation Plan

* [x] Add per-instance launch option storage for non-conflicting arguments.

* [x] Add a super-admin Settings UI for the launch options.

* [x] Apply the selected arguments when starting PalServer.

* [x] Update project docs, memory, changelog, and verification notes.

---

## Files Modified

* `app/routes/instances.py`
* `app/services/instance_store.py`
* `app/services/process_manager.py`
* `web/src/api/instancesApi.ts`
* `web/src/components/settings/InstanceManagerPanel.tsx`
* `web/src/types/models.ts`
* `README.md`
* `CHANGELOG.md`
* `.claude/memory/architecture.md`
* `.claude/memory/decisions.md`
* `.claude/memory/project_memory.md`
* `.claude/memory/ticket_memory.md`

---

## Testing

* Passed: `npm.cmd run build`
* Passed: `py -3.12 -m compileall app\routes\instances.py app\services\instance_store.py app\services\process_manager.py`

---

## Result

Settings now includes per-server controls for Palworld's non-conflicting launch options:

* Performance launch flags: `-useperfthreads`, `-NoAsyncLoadingThread`, `-UseMultithreadForDS`
* Worker thread override: `-NumberOfWorkerThreadsServer=<value>`
* JSON logs: `-logformat=json`

Existing behavior is preserved by default: performance flags remain on for existing servers, while worker thread override and JSON logs default off.

---

## Notes

Avoid duplicating launch args already represented by existing app settings:

* `-port` is owned by World Settings/Super Admin game-port flow.
* `-players` is already part of deployment/world configuration.
* `-publiclobby` is already the Community Server toggle.
* `-publicip` and `-publicport` are intentionally deferred because they overlap the networking/share-with-friends flow and need a clearer single-source design.

---

## Closed

2026-07-08
