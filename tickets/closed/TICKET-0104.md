# TICKET-0104

**Status**

Closed

**Type**

Feature

**Priority**

Medium

**Created**

2026-07-13

---

## Description

Add a "Save Import" tool so a host can bring an existing Palworld world save (e.g. a co-op save from their own Steam client PC) onto a server registered in AutoPalExpress, even when Steam was never installed on the machine running the server.

Flow:

* Super admin clicks "Import Save" (Settings > Automation, next to the existing backup tools).
* A native folder-picker dialog (same mechanism as "Import Existing Server") lets them pick either the exact world-save folder or a parent folder (e.g. a `SaveGames\<SteamID>` folder) containing one or more world saves.
* The backend inspects the chosen folder for valid Palworld world saves (identified by `Level.sav`) and returns candidates with name, size, and last-modified time.
* After the admin confirms a candidate, the backend requires the active server to be stopped, automatically snapshots the server's current `SaveGames` folder into the existing backups store (so nothing is lost), then replaces the server's save slot with the imported world folder.

---

## Reason

User request via support/community post: a host set up a dedicated server on a spare PC that never had Steam installed, and had no clear way to move their existing co-op save onto it. No existing AutoPalExpress feature covers this - `backup_service.py` only backs up a save that's already on the server.

---

## Implementation Plan

* [x] `app/services/backup_service.py`: add a small public `backup_before_import()` helper that snapshots the current `SaveGames` folder into the existing backups store (reusing the existing private helpers), so an import is preceded by a real, listed backup instead of a silent overwrite.
* [x] `app/services/save_import_service.py` (new): `inspect_source()` walks the chosen folder (itself or one level of children) for folders containing `Level.sav` and returns candidate metadata; `import_save()` validates the server is offline, calls `backup_service.backup_before_import()`, clears the destination `SaveGames/0` slot, and copies the chosen world folder in under its own GUID name.
* [x] `app/routes/automation.py`: add `POST /save-import/browse` (native folder picker), `POST /save-import/inspect`, `POST /save-import/apply` - all already covered by the router's existing super-admin-only dependency.
* [x] `web/src/api/automationApi.ts`: add `browseSaveImportDir`, `inspectSaveImport`, `applySaveImport`.
* [x] `web/src/types/models.ts`: add `SaveImportCandidate` type.
* [x] `web/src/components/settings/SaveImportDialog.tsx` (new): browse -> candidate list (when more than one) -> confirmation with backup/overwrite warning -> apply.
* [x] `web/src/components/settings/AutomationPanel.tsx`: add an "Import Save" button next to "Backup Now" that opens the new dialog and refreshes the backups list on success (the pre-import snapshot shows up there too).
* [x] `README.md`: document the feature under "What It Helps With" and "What Is Real".

---

## Files Modified

* `app/services/backup_service.py`
* `app/services/save_import_service.py` (new)
* `app/routes/automation.py`
* `web/src/api/automationApi.ts`
* `web/src/types/models.ts`
* `web/src/components/settings/SaveImportDialog.tsx` (new)
* `web/src/components/settings/AutomationPanel.tsx`
* `README.md`
* `CHANGELOG.md`

---

## Testing

* `python -m py_compile` on all new/changed backend files - passes.
* `npx tsc --noEmit` in `web/` - passes with no errors.
* Built a throwaway fixture (fake server folder + fake client `SaveGames/<SteamID>/<WorldGUID>` folders, cleaned up after) and ran `inspect_source`/`import_save` directly through the project's real venv to verify actual filesystem behavior, since there's no real Palworld install or running server in this environment:
  * Inspecting a parent folder with two valid world saves and one unrelated folder returns exactly the two real saves.
  * Inspecting an exact world-save folder returns just that one candidate.
  * Inspecting a folder with no `Level.sav` raises `SaveImportError` (surfaced as a 400).
  * Importing replaces the destination `SaveGames/0` slot with the chosen world folder and creates a listed, `preImport`-flagged backup of what was there before.
  * Importing a second time in immediate succession backs up the just-imported save before replacing it again.
* This test run caught a real bug before it shipped: `backup_service`'s second-precision timestamp folder name collided (`FileExistsError`) when two backups landed in the same second - easy to hit with two quick imports back to back. Fixed with `_unique_backup_dest()` (falls back to a numbered suffix), applied to both `run_backup()` and the new `backup_before_import()`.
* Not tested: the actual browser UI end-to-end (native folder picker dialog, candidate list clicking, dialog states) and the "reject import while server is online" path against a real running Palworld process - no real Palworld server available in this environment. The offline-rejection logic itself was verified by code inspection (`process_manager.get_status` returns `"offline"` for any instance with no live process, which `import_save` checks before doing anything).

---

## Result

Implemented as planned. "Import Save" now lives in Settings > Automation next to the existing backup controls. A host can point it at a copied-over world save folder (or its parent, if unsure which world it is), pick from the candidates found, and confirm - the server's current save is snapshotted into the existing backups list first, then replaced. No Steam install is required on the machine running the server, since the fix only ever touches `Pal/Saved/SaveGames/0/`, which is a fixed dedicated-server slot name unrelated to any Steam account.

Along the way, fixed a latent same-second backup-folder collision bug in `backup_service.py` that this feature made much easier to trigger.

---

## Notes

Palworld's `.sav` files are compressed GVAS binaries - actually parsing them for the in-game world name would need a dedicated save-file parser, which is out of scope. Candidates are identified and shown by folder name (the world GUID), size, and last-modified time instead.

---

## Closed

2026-07-13