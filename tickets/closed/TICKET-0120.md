# TICKET-0120

**Status**

Closed

**Type**

Bug

**Priority**

High

**Created**

2026-07-13

---

## Description

Fully revert the "Run Silently" feature (TICKET-0116, and its follow-on fixes TICKET-0117/0118/0119) per direct user request: "revert the option to run silent, it messes up things, roll back." Three consecutive fix attempts each surfaced a new Windows/PyInstaller-specific problem without ever reaching a real, user-confirmed working state - rather than attempt a fourth, the user asked to remove it entirely.

Removed:

* The Super Admin "Run Silently" toggle and its panel.
* `runSilently` from `system_settings.json`'s schema/API.
* The conditional `CREATE_NO_WINDOW` launch flag for Palworld's own console (back to always visible, matching the state before TICKET-0116).
* The two-executable PyInstaller build (`PalworldServerAdmin.exe`/`PalworldServerAdminSilent.exe`) - back to a single `PalworldServerAdmin.exe`.
* The installer's "Run Silently?" wizard page and the paired `Check:`-gated `[Icons]`/`[Run]`/`[Registry]` entries - back to a single unconditional set of each.
* All related README/CHANGELOG mentions.

---

## Reason

Direct user request after real, live testing kept surfacing new problems across three follow-on tickets. Rather than continue debugging a feature the user no longer wants, revert it cleanly.

---

## Implementation Plan

* [x] `git revert --no-commit` on TICKET-0119/0118/0117's three isolated commits (fa0a130, 8ecf0bb, 2985ea3) - clean, no conflicts, since those commits touched only Run-Silently-related files.
* [x] Manually removed the remaining TICKET-0116-originated code that predated those three commits (so the git revert alone didn't reach it): `app/services/system_settings.py` (`runSilently` default/param), `app/routes/system_settings.py` (`runSilently` field), `app/services/process_manager.py` (`_run_silently_enabled()` and the conditional creation flag, back to the original unconditional `CREATE_NEW_PROCESS_GROUP`), deleted `web/src/components/settings/RunSilentlyPanel.tsx`, removed its import/usage from `web/src/pages/SuperAdmin.tsx`, removed `runSilently` from `web/src/types/models.ts`.
* [x] `README.md`: removed the remaining Run Silently feature-list bullet and restored "Logs And Windows" to its pre-TICKET-0116 wording exactly.
* [x] `CHANGELOG.md`: removed the TICKET-0116 entry (0117/0118/0119 entries were already removed by the git revert).
* [x] `tickets/closed/TICKET-0116.md`: marked as reverted with a pointer to this ticket, rather than deleted outright - kept as a record of what was tried and why it didn't work, per this project's ticket-memory conventions.
* [x] Rebuilt the packaged executable (back to one exe) and the installer (back to one unconditional set of Icons/Run/Registry entries, no wizard page).

---

## Files Modified

* `app/services/system_settings.py`
* `app/routes/system_settings.py`
* `app/services/process_manager.py`
* `desktop_app.py` (already restored to simple form by the TICKET-0119 revert)
* `PalworldServerAdmin.spec` (already restored to single-exe by the TICKET-0119 revert)
* `installer.iss` (already restored by the TICKET-0119/0118/0117 reverts)
* `web/src/components/settings/RunSilentlyPanel.tsx` (deleted)
* `web/src/pages/SuperAdmin.tsx`
* `web/src/types/models.ts`
* `README.md`
* `CHANGELOG.md`
* `tickets/closed/TICKET-0116.md`

---

## Testing

* `python -m py_compile` on all changed backend files - passes.
* `npx tsc --noEmit` on the frontend - passes with no errors.
* Confirmed the whole backend app still imports cleanly (`from app.main import app`).
* Grepped the whole repo for `runSilently`/`RunSilently`/`PalworldServerAdminSilent`/`_run_silently_enabled`/`_apply_run_silently`/`_relaunch_silently`/`MyAppExeNameSilent` - found none remaining in actual code, only in the historical closed tickets and this ticket's own text.
* Caught and fixed a real mistake mid-revert: `git revert`-ing the three isolated commits in newest-first order restored `desktop_app.py` to TICKET-0116's *original* (`ShowWindow`-based) version rather than a clean pre-0116 state, since that file's relaunch-hack code was only fully removed by TICKET-0119 - reverting TICKET-0119 undid that removal. Manually stripped the leftover `_apply_run_silently()` afterward.
* Rebuilt via `scripts\build.bat` - confirms a single `PalworldServerAdmin.exe` is produced again (no `PalworldServerAdminSilent.exe`), and the installer compiles with no wizard page for this feature. New installer checksum: `8AAD9B9F2C2F26C0C09647A22A9D071CE041C9296178E21C9DB3F934AF527803`.

---

## Result

Fully reverted and rebuilt (checksum above; README and `installer_output/CHECKSUMS.txt` updated to match). No Run Silently code, setting, UI, or installer prompt remains anywhere in the app.

---

## Notes

If "run silently"/headless mode is requested again in the future, see the retrospective note added to `tickets/closed/TICKET-0116.md` - the TICKET-0119 two-executable, install-time-choice approach was the technically correct direction (verified via a real executable-level test, not just mocks) and would be the right starting point rather than the original runtime hide/relaunch approach, which failed twice for two different reasons.

---

## Closed

2026-07-13