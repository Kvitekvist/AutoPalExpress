# TICKET-0032

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

Add a noticeable Settings-page checkbox for making a Palworld server appear in the Community Server list.

---

## Reason

Users remember needing to add SteamCMD/server launch arguments manually. AutoPalExpress currently hardcodes Palworld launch arguments and does not expose the community-listing option, so hosts have no obvious way to enable it from the app.

---

## Implementation Plan

* [x] Persist a per-instance community-listing option.
* [x] Add a super-admin Settings checkbox on server instance cards.
* [x] Include Palworld's community-listing launch argument when starting enabled instances.
* [x] Update project records and verify backend/frontend builds.

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
* `tickets/TICKET-0032.md`

---

## Testing

* `npm.cmd run build`
* `py -3.12 -m compileall app\routes\instances.py app\services\instance_store.py app\services\process_manager.py`
* `py -3.12 -m compileall app\routes\instances.py`

---

## Result

Settings now shows a prominent per-server "Show in Community Server list" switch. When enabled, the server receives Palworld's `-publiclobby` launch argument the next time AutoPalExpress starts it.

---

## Notes

This is intentionally a dedicated boolean rather than a free-form launch-argument field, to keep support and unsafe argument combinations contained.

---

## Closed

2026-07-08
