# TICKET-0151

**Status**

Closed

**Type**

Enhancement

**Priority**

Low

**Created**

2026-07-15

---

## Description

The Recent Backups table (Settings > Automation) had no way to find where a backup actually lives on disk - a user who needed to manually restore one had to hunt through the data folder by hand. Added an "Open Folder" button per backup row.

---

## Reason

A user's community report (shared by the app owner, unsure which version it was from) said: "having the filepath on the backup UI would be a nice addition" after having to search for a backup's location manually. Checked against the current codebase and confirmed `BackupRecord` genuinely had no path field yet - this part of the report was still valid regardless of which version it originally came from.

---

## Implementation Plan

* [x] `app/services/backup_service.py`: both `run_backup()` and `backup_before_import()` now store a `folder` field in `meta.json`. `list_backups()` always overwrites `folder` from the record's real on-disk location rather than trusting what's stored, so backups made before this change still show a correct path with no migration step needed.
* [x] `app/routes/automation.py`: added `POST /api/automation/backups/{timestamp}/open`, mirroring the existing per-instance "open server folder" route (`os.startfile`).
* [x] `web/src/types/models.ts`: `BackupRecord` gained `folder: string`.
* [x] `web/src/api/automationApi.ts`: added `openBackupFolder(timestamp)`.
* [x] `web/src/components/settings/AutomationPanel.tsx`: Recent Backups table gained an "Open Folder" column/button per row.

---

## Files Modified

* `app/services/backup_service.py`
* `app/routes/automation.py`
* `web/src/types/models.ts`
* `web/src/api/automationApi.ts`
* `web/src/components/settings/AutomationPanel.tsx`

---

## Testing

* Direct Python test: simulated a legacy `meta.json` missing `folder` alongside a new one that already has it, confirmed `list_backups()` correctly backfills the legacy record's path and preserves the new one's - both end up pointing at their real on-disk folder.
* `python -m py_compile`, `npx tsc --noEmit`, and `npm run build` all pass.
* Not tested through a real live browser session (no interactive desktop in this sandbox) - the route reuses `os.startfile`, an already-proven pattern from `instances.py`'s existing "open server folder" route.

---

## Result

Every row in Recent Backups now has an "Open Folder" button that opens that exact backup's location in Explorer, instead of requiring a manual search through the data folder.

---

## Closed

2026-07-15
