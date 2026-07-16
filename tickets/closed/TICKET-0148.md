# TICKET-0148

**Status**

Closed

**Type**

Bug

**Priority**

High

**Created**

2026-07-14

---

## Description

User reported being unable to import an existing world save via Save Import, with no specific error message or repro steps given.

User later gave concrete direction to unblock this without a repro: improve world discovery beyond one directory level, recognize common Steam/Palworld folder layouts automatically, validate important save files, show a preview of source and destination, verify the copied result, and automatically restore the pre-import backup if copying fails. Explicitly called out: the current implementation deletes the destination before copying, so interrupted copies deserve special attention.

---

## Reason

Part of the same user mod-installation feedback as TICKET-0142 through TICKET-0146: "The user was unable to import an existing world save (a separate bug, possibly related to the Save Import feature)." Most likely root cause once actually reasoned through: `inspect_source()` only ever looked at the picked folder itself or one level under it. A client's real save path is `Pal/Saved/SaveGames/<SteamID>/<WorldGUID>/Level.sav` - two levels below `SaveGames` itself, three below `Saved`, four below `Pal`. A user pointing the picker at anything other than the exact `<SteamID>` folder (very plausible - `SaveGames` itself, or the whole `Saved` folder they copied over) would get "No Palworld world save was found" with no further help, matching a plausible interpretation of the original vague report.

---

## Implementation Plan

* [x] Bounded-depth (up to 4 levels) recursive world-save discovery in `inspect_source`, replacing the old root-or-one-level-down check - covers every real layout (`<world>/`, `<slot-or-steamid>/<world>/`, `SaveGames/.../<world>/`, `Saved/SaveGames/.../<world>/`, `Pal/Saved/SaveGames/.../<world>/`) automatically, with a directories-scanned safety cap so pointing at something huge (a whole drive) fails fast with a clear message instead of hanging.
* [x] Validate required save files (`Level.sav`, `LevelMeta.sav`) exist and are non-empty before allowing import; surface per-candidate validation issues from `inspect_source` too, so the picker can warn before the user even selects a broken candidate.
* [x] `inspect_destination()` - describes whatever world currently sits in the server's active save slot, so the UI can show source vs. destination side by side before confirming.
* [x] Verify the copied result (per-file existence + size check against the source) before considering an import successful.
* [x] Replace the delete-then-copy pattern with `app/services/safe_replace.py`'s copy-to-temp -> verify -> atomic rename-swap, so the live save slot is never left mid-copy; self-heals if the final swap itself fails, using the just-renamed-aside original rather than needing the separate timestamped backup for that specific case.
* [x] As an outer safety net, automatically restore from the `backup_before_import()` snapshot if the safe-replace step fails for any other reason.
* [x] Frontend: show the destination preview and per-candidate validation issues in `SaveImportDialog.tsx`; disable Import for an invalid candidate.

---

## Files Modified

* `app/services/safe_replace.py` (new, shared with TICKET-0155's backup restore) - manifest building/verification, copy verification, the safe copy-to-temp/verify/atomic-swap primitive.
* `app/services/save_import_service.py` - bounded-depth BFS discovery (`_find_world_saves`), `_missing_or_empty_required_files`/`_validate_world_save_folder`, `inspect_destination()`, `_replace_slot_with_world()` (stages the new world one level deep under a throwaway temp parent so `safe_replace_dir` can safely swap the whole slot), automatic rollback from `backup_before_import()`'s snapshot in `import_save()`'s except block.
* `app/routes/automation.py` - new `GET /save-import/destination` route; updated the browse-dialog prompt text to mention deeper layouts are found automatically.
* `web/src/types/models.ts` - `SaveImportCandidate` gained `valid`/`issues`.
* `web/src/api/automationApi.ts` - `getSaveImportDestination()`.
* `web/src/components/settings/SaveImportDialog.tsx` - destination + source preview cards (`WorldPreviewCard`), per-candidate issue display in the multi-result picker, Import disabled for an invalid candidate.
* `tests/test_save_import.py` - extended with deep-discovery (2/3/4-level layouts), the scan-depth/scan-count safety caps, validation rejection cases, destination preview, and rollback-on-failure (including the "rollback also fails" path).

---

## Testing

`tests/test_save_import.py` (20 tests) and `tests/test_safe_replace.py` (10 tests, shared primitive) all pass, plus route-level coverage in `tests/test_automation_routes.py`. Full backend suite (120 tests) passes on Python 3.11 and 3.12. `npm run build`/`npm run lint` pass clean.

Not covered by automated tests, matching this project's existing manual-verification pattern: a real interrupted copy (killing the process mid-copy) against a real Palworld install, and the actual browser UI (destination/source preview cards, disabled Import button) in a live session - I don't have credentials for the user's real installed account to click through this myself.

---

## Result

Save Import now finds a world save from any of the real Palworld folder layouts a user might reasonably point it at, validates the save looks complete before touching anything, shows what's currently on the server next to what's about to replace it, verifies the copy actually landed correctly, and can no longer leave a server's active save slot empty/partial if an import is interrupted - it's copied to a verified temporary location first and only swapped in once confirmed good, with the pre-import backup as an automatic last-resort restore.

---

## Notes

Still no confirmed reproduction of the original vague user report - this closes the ticket based on the concrete hardening direction the user gave instead, which plausibly explains (deeper discovery) and directly prevents (safe replace + validation + verification) the class of failure a vague "couldn't import" report would describe. Implemented together with TICKET-0155 (one-click backup restore), which shares `safe_replace.py`.

---

## Closed

2026-07-16
