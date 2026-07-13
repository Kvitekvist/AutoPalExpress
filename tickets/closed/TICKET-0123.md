# TICKET-0123

**Status**

Closed

**Type**

Feature

**Priority**

High

**Created**

2026-07-13

---

## Description

Move all AutoPalExpress app data (accounts, server registry, mods records, backups references, logs, diagnostics reports, first-run settings) from `%LOCALAPPDATA%\PalworldServerAdmin\data` into a `data` folder inside wherever the app is installed, so a single install folder is fully self-contained. Nothing should be written to AppData anymore.

Two decisions confirmed with the user:
1. **Install location:** keep it simple - one user-picked install folder, always writable by that user. No "install for all users"/admin-elevated path to worry about; drop `PrivilegesRequiredOverridesAllowed` so the installer never offers to elevate, guaranteeing the chosen folder is always writable by the installing user (this is already Inno's default per-user behavior with `PrivilegesRequired=lowest` when no elevation is offered).
2. **Existing installs:** auto-migrate. The first time an updated build runs and finds real data still sitting in the old `%LOCALAPPDATA%` location but nothing yet in the new install-folder location, move it over automatically, then tell the user once (a one-time message) that this happened and what was carried over.

---

## Reason

Direct user request: "I want to set this up so that nothing goes into appdata folder. Everything should live inside the install folder." Makes the app fully portable/self-contained (back up or move the whole install folder and you have everything), which matters more for this project than the traditional per-user-profile Windows convention `%LOCALAPPDATA%` was originally chosen for.

---

## Implementation Plan

* [x] `app/paths.py`: `data_dir()` now resolves to `install_dir() / "data"` when frozen (was `%LOCALAPPDATA%\PalworldServerAdmin\data`). Added `migrate_legacy_data_if_needed()`: a one-time, idempotent (module-level guard) check - if the new location is empty/missing and the old `%LOCALAPPDATA%` location has real data, `shutil.move()` the whole folder over. Returns whether it actually migrated, so the caller can notify the user.
* [x] `desktop_app.py`: calls `migrate_legacy_data_if_needed()` as the very first thing in `main()` (before `_tee_console_streams()`, which itself calls `data_dir()`); if it returns True, shows a one-time `MessageBoxW` notice (generalized the existing error-only `_show_startup_error` into `_show_message_box(message, icon)` so this one can use an information icon instead of an error icon) that data was moved into the install folder and everything was carried over automatically.
* [x] `installer.iss`:
  * Removed `PrivilegesRequiredOverridesAllowed=dialog` (kept `PrivilegesRequired=lowest`) so install is always per-user/non-elevated, guaranteeing `{app}` is writable.
  * Every Pascal `{localappdata}\PalworldServerAdmin\data` reference now uses `{app}\data` (`ServerInstallDirPage` default, `SaveStartupRecoverySettings`, `RunFirstTimeSetup`'s log path, `CurUninstallStepChanged`). `HasAdminAccount`/`HasServerData` check the new `{app}\data` path OR the legacy AppData path, since these wizard checks run *before* the Python app's own migration logic ever executes - an existing upgrader's data is still only in the old spot at that point, so both need checking for the wizard to still correctly skip pages for existing users.
  * Diagnose AutoPalExpress Start Menu shortcut's `-DataDir`/`-ReportDir` params moved from `{localappdata}\PalworldServerAdmin\...` to `{app}\data`/`{app}\diagnostics`.
  * Updated the `[Registry]` section's explanatory comment.
* [x] `app/services/diagnostics.py`: `_report_dir()` already derives from `paths.data_dir().parent`, so it follows automatically - updated its stale comment.
* [x] `README.md`'s "Where Data Is Stored" section, `GETTING_STARTED.md`, and `NEXUS_DESCRIPTION.md`: new location, and a note that upgrading auto-migrates existing data with a one-time notice.
* [x] Confirmed nothing else reads `%LOCALAPPDATA%` directly instead of going through `paths.py` (`support/diagnose-autopalexpress.ps1`'s own defaults are only used as a fallback for someone running the script completely standalone - both real callers, the installer's Start Menu shortcut and `diagnostics.py`, always pass explicit `-DataDir`/`-ReportDir` args now).

---

## Files Modified

* `app/paths.py`
* `desktop_app.py`
* `installer.iss`
* `app/services/diagnostics.py`
* `README.md`
* `GETTING_STARTED.md`
* `NEXUS_DESCRIPTION.md`

---

## Testing

* `python -m py_compile app/paths.py desktop_app.py app/services/diagnostics.py` - passes.
* Simulated `is_frozen()`/`sys.executable`/`LOCALAPPDATA` directly in Python to unit-test `migrate_legacy_data_if_needed()`'s three paths (migrates real legacy data once and is a no-op on the second call; no-ops cleanly with no legacy data present) - all passed.
* Full rebuild via `scripts\build.bat` - frontend, PyInstaller, and Inno Setup (including the rewritten `[Code]` section) all compiled cleanly.
* Real end-to-end smoke test against the actual built `dist\PalworldServerAdmin.exe`, run in isolated scratch folders (not the real machine's AppData/install) with `$env:LOCALAPPDATA` overridden per Windows session state:
  * **Upgrade scenario:** seeded a fake legacy `LOCALAPPDATA\PalworldServerAdmin\data` with `users.json`/`instances.json`, ran the real exe pointed at a fresh scratch "install" folder - confirmed both files landed in `<install>\data` and the legacy folder was gone.
  * **Fresh-install scenario:** ran the real exe with no legacy data present - it booted successfully (`HTTP 200` from `/`), and all runtime folders/files (`instances.json`, `backend.log`, `steamcmd/`, etc.) were created self-contained under `<install>\data`, with nothing written to the fake AppData path at all.
* New installer SHA256 (see README/CHANGELOG): `5466E7F90BEBFA8A843DA31144BCE770F1604DD5EB4BF47DE57C93BE9223F919`.

---

## Result

AutoPalExpress data now lives entirely inside the install folder (`<install>\data`, `<install>\diagnostics`), verified against the real packaged build for both a fresh install and an upgrade carrying over real existing data. The installer no longer offers an all-users/admin-elevated install, so the chosen folder is always writable. Existing users upgrading get their data moved automatically with a one-time popup explaining what happened.

---

## Notes

This is an architecture-level change - decisions on install-location handling and migration behavior were confirmed with the user via AskUserQuestion before implementing, per this project's "never assume architecture" rule.

---

## Closed

2026-07-13
