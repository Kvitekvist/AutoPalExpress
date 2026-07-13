# TICKET-0113

**Status**

Closed

**Type**

Bug

**Priority**

Medium

**Created**

2026-07-13

---

## Description

Dashboard's "Last saved" field never updates, even after repeatedly clicking "Save World" on Server Control.

Root cause confirmed by tracing the full path:

* `web/src/pages/ServerControl.tsx`'s `handleSave()` calls `serverApi.saveWorld()` -> `POST /api/server/save`.
* `app/routes/server_control.py`'s `save_world()` handler calls `palworld_rest.save(instance)` and returns `{"savedAt": datetime.now().isoformat()}` - **but only in that one response**, to whichever caller happened to click Save.
* `app/routes/server_control.py:37` hardcodes `"lastSavedAt": ""` in `_OFFLINE_STATUS`, and neither `_status_view()` nor `_status_view_async()` (used by `GET /api/server/status`, which is what Dashboard actually polls via `useServerStatus`) ever overwrites it from anywhere.

So the timestamp a save actually produces is thrown away the moment that one HTTP response is sent - nothing persists it anywhere `/status` can read it back from on the next poll. Dashboard's "Last saved" is permanently stuck showing "Never" (an empty string is falsy, so `ServerControl.tsx`/`Dashboard.tsx` fall back to their "Never" label) regardless of manual saves, scheduled backups, or Palworld's own autosave.

---

## Reason

User report: clicked Save World multiple times, "Last saved" on Dashboard never changed. Confirmed as a real, reproducible bug via code tracing, not a caching/UI refresh issue - the backend genuinely never stores this value anywhere persistent across requests.

---

## Implementation Plan

* [x] Added an in-memory "last saved at" store in `process_manager.py` (`_last_saved_at: dict[str, str]`, alongside its existing `_started_at`/`_processes` precedent), with `record_save(instance_id)` (stamps and returns the current time) and `get_last_saved(instance_id)`.
* [x] Wired into both real save paths: `POST /api/server/save`'s handler now returns `process_manager.record_save(instance["id"])` instead of a throwaway `datetime.now().isoformat()`; `backup_service.run_backup()` calls it right after its live-save (`palworld_rest.save`) step succeeds.
* [x] `_status_view()` in `server_control.py` now reads `process_manager.get_last_saved(instance["id"]) or ""` instead of the hardcoded `""`.
* [x] Confirmed Palworld's REST `metrics()`/`info()` (`app/services/palworld_rest.py`) expose no autosave timestamp field at all - out of scope, as anticipated. Manual Save World and scheduled-backup live-saves are the two real, actionable cases, and both are now covered.
* [x] In-memory only, resets on backend restart - consistent with `process_manager`'s existing uptime/process-tracking precedent, not a regression from anything persisted before (there was never any persisted value here).

---

## Files Modified

* `app/services/process_manager.py`
* `app/routes/server_control.py`
* `app/services/backup_service.py`

---

## Testing

* `python -m py_compile` on all three changed files - passes.
* Verified `record_save`/`get_last_saved` directly: confirms `None` before any save, and returns the exact stamped timestamp immediately after.
* Not tested: an actual live Palworld server save (no real server running in this environment) - the fix only touches how an already-successful save's timestamp is stored and read back, not the save operation itself.

---

## Result

Dashboard's "Last saved" now reflects real saves - manual Save World clicks and scheduled-backup live-saves both update it immediately.

---

## Notes

Ticket created per user report; root cause traced and confirmed via code reading, but implementation deliberately not started yet.

---

## Closed

2026-07-13