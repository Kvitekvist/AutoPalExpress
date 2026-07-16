# TICKET-0155

**Status**

Closed

**Type**

Feature

**Priority**

High

**Created**

2026-07-16

---

## Description

Backups can currently only be created and their folder opened in Explorer - restoring one back onto the server requires the user to manually copy files themselves. Make restoration a first-class workflow: one-click Restore, Verify, Download/Export, and optional per-backup notes. Before restoring, stop the server and take a rollback snapshot of the current state first. Store file counts and checksums in each backup's `meta.json` so incomplete or corrupted backups can be detected. Replace the fixed 10-backup retention limit with configurable count/age/storage limits.

## Reason

User request. Backups existing but being unrestorable except by hand defeats much of their purpose as a safety net.

---

## Implementation Plan

* [x] `app/services/safe_replace.py` (new, shared with TICKET-0148) - manifest building (per-file path/size/sha256), manifest verification, copy verification, and the safe copy-to-temp/verify/atomic-rename-swap primitive used for any destructive directory replacement in this app.
* [x] `backup_service.py`: compute and store a file manifest + file count in every new backup's `meta.json`; `verify_backup()` re-checks a backup's real on-disk files against that manifest (three-state result: verified good, corrupted/incomplete, or "no manifest to verify against" for backups made before this existed); `restore_backup()` refuses a failed-verification backup, stops the server if it's running, snapshots the current live save as a rollback point, then safely replaces the live SaveGames folder with the backup's contents - restoring from that just-taken rollback snapshot automatically if anything goes wrong; `set_backup_notes()`; `export_backup_zip()` zips a backup for download.
* [x] `automation_store.py`: replace the hardcoded `MAX_BACKUPS = 10` with a configurable `backupRetention` block (`maxCount`, `maxAgeDays`, `maxTotalBytes` - each nullable/unlimited), defaulting to the old fixed behavior (`maxCount: 10`) for existing installs.
* [x] `automation.py` routes: `POST /backups/{ts}/restore`, `POST /backups/{ts}/verify`, `GET /backups/{ts}/export` (zip download), `PATCH /backups/{ts}/notes`; extend the automation config request/response with `backupRetention`.
* [x] Frontend (`AutomationPanel.tsx`): Restore/Verify/Export/notes-edit actions per backup row, an integrity indicator, and retention limit fields in the automation settings form.

---

## Files Modified

* `app/services/safe_replace.py` (new) - `sha256_file`, `build_manifest`, `verify_manifest`, `verify_copy`, `safe_replace_dir`, `SafeReplaceError`/`SafeReplaceCriticalError`.
* `app/services/backup_service.py` - `BackupError`; unified snapshot creation (`_create_snapshot`, used by `run_backup`/`backup_before_import`/the new pre-restore snapshot) now records a manifest + file count + notes in `meta.json`; `verify_backup`, `set_backup_notes`, `export_backup_zip`, `restore_backup`; `_prune_old_backups` rewritten around configurable retention instead of a fixed `MAX_BACKUPS`; `run_backup` takes an optional `kind` (manual/scheduled) so the list can show which.
* `app/services/automation_store.py` - `DEFAULT_BACKUP_RETENTION`, backfilled into `load()` for configs saved before this existed.
* `app/services/scheduler.py` - passes `kind="scheduled"` to `run_backup`.
* `app/routes/automation.py` - `BackupRetentionModel` folded into `AutomationConfigRequest`; new verify/restore/notes/export routes.
* `web/src/types/models.ts` - `BackupRetentionConfig`, `BackupKind`, `BackupVerifyResult`, `BackupRestoreResult`; `BackupRecord` gained `kind`/`fileCount`/`notes`/`hasManifest`.
* `web/src/api/automationApi.ts` - `verifyBackup`, `restoreBackup`, `setBackupNotes`, `backupExportUrl`.
* `web/src/components/settings/AutomationPanel.tsx` - retention fields in the automation form; Kind/Notes/Integrity/Actions columns on the backups table; a `RuneDialog` restore confirmation (explains the auto-stop and rollback snapshot before proceeding).
* `tests/test_safe_replace.py`, `tests/test_backup_restore.py`, `tests/test_automation_routes.py` (new/extended) - manifest round-trip, corruption detection, restore success/stop-first/refuse-corrupted/auto-rollback-on-failure, notes, export, and all three retention dimensions.

---

## Testing

`tests/test_safe_replace.py` (10 tests) and the extended `tests/test_backup_restore.py` (23 tests) plus route-level coverage in `tests/test_automation_routes.py` all pass. Full backend suite (120 tests) passes on Python 3.11 and 3.12. `npm run build`/`npm run lint` pass clean.

Not covered by automated tests, matching this project's existing manual-verification pattern: restoring onto a real running Palworld server (the actual `process_manager.stop()` call, exercised elsewhere but not re-verified live here), and the browser UI (Restore confirmation dialog, Verify badge, notes inline-edit, Export download) in a live session - I don't have credentials for the user's real installed account to click through this myself.

---

## Result

Recent Backups is now a real restore workflow, not just a create-and-browse-in-Explorer list: Restore (with an automatic pre-restore rollback snapshot and auto-stop), Verify (against a checksum manifest recorded at backup time), Export as a downloadable zip, and per-backup notes. Retention is now configurable (count/age/total size) instead of a hardcoded 10.

---

## Notes

Implemented together with TICKET-0148 (Save Import hardening), which reuses `safe_replace.py`'s copy-to-temp/verify/atomic-swap primitive for its own destination-slot replacement instead of a second bespoke implementation. New UI strings shipped with English `defaultValue` text only (the established i18n fallback pattern) - translating them into the other 5 locales is a reasonable, self-contained fast-follow, not done here given the size of this combined ticket pair.

---

## Closed

2026-07-16
