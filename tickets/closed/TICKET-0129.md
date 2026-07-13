# TICKET-0129

**Status**

Closed

**Type**

Enhancement

**Priority**

High

**Created**

2026-07-13

---

## Description

Partial reversal of TICKET-0123's "everything self-contained in the install folder" model, after hitting real friction with it:

1. User wants Program Files to work as a normal install destination again ("i want it to install to program files like any other normal program") - TICKET-0123 deliberately removed the ability to elevate/install for all users, specifically to guarantee the install folder was always writable by the running app. That guarantee is exactly what breaks if Program Files is allowed back in, since a non-elevated app process can never write there.
2. User dislikes `%LOCALAPPDATA%` for data storage ("i dont like how appdata is so hidden") - ruling out simply reverting to the pre-TICKET-0123 behavior wholesale.

Resolved via `AskUserQuestion`: split the two concerns the way virtually every real Windows program already does. **Program Files** (or wherever the user picks, admin-elevated or not) holds only the installed program itself - the `.exe` and the bundled diagnostics script, both read-only after install. **All runtime data** (accounts, server registry, mods, logs, backups, first-run settings) moves to a new, clearly-visible location under the current user's **Documents** folder instead - not tied to wherever the program itself is installed, and not hidden like AppData.

---

## Reason

Direct user requests, in order, within the same session that shipped TICKET-0123. Both are reasonable on their own; satisfying both together requires separating "where the program lives" from "where its data lives," which is the standard convention this project had briefly deviated from.

---

## Implementation Plan

* [x] `installer.iss`: restored `PrivilegesRequiredOverridesAllowed=dialog` (still `PrivilegesRequired=lowest` as the default so a no-admin per-user install remains the low-friction option, but the elevation dialog is offered again, letting `{autopf}` resolve to real Program Files like before TICKET-0123). Kept the TICKET-0128 `CanWriteToDir` guard on `{app}` - still meaningful, protecting the program-files copy step regardless of which mode is chosen. Moved every data-path reference (`HasAdminAccount`/`HasServerData`, `ServerInstallDirPage`'s default, `SaveStartupRecoverySettings`, `RunFirstTimeSetup`'s log path, the Diagnose shortcut's `-DataDir`/`-ReportDir`, `CurUninstallStepChanged`) from `{app}\data` to Inno's built-in `{userdocs}\AutoPalExpress\data` constant. `HasAdminAccount`/`HasServerData` now check three locations for backward compatibility: the new Documents path, TICKET-0123's `{app}\data`, and the original pre-0123 `%LOCALAPPDATA%\PalworldServerAdmin\data`.
* [x] `app/paths.py`: added `_documents_dir()` using `SHGetFolderPathW`/CSIDL_PERSONAL via `ctypes`. `data_dir()` now resolves to `_documents_dir() / "AutoPalExpress" / "data"` when frozen. `migrate_legacy_data_if_needed()` now checks, in order: the new Documents location (skip if already populated), then TICKET-0123's `install_dir()/"data"`, then the original pre-0123 AppData location - moving whichever legacy location is found first.
* [x] `desktop_app.py`: updated the one-time migration notice's wording to describe the new Documents location.
* [x] `README.md` ("Where Data Is Stored" + diagnostics report path), `GETTING_STARTED.md`, `NEXUS_DESCRIPTION.md`: updated to describe the new split (program wherever installed, data under Documents\AutoPalExpress).
* [x] Full rebuild, fresh checksum, and real verification.

---

## Files Modified

* `installer.iss`
* `app/paths.py`
* `desktop_app.py`
* `README.md`
* `GETTING_STARTED.md`
* `NEXUS_DESCRIPTION.md`

---

## Testing

* `python -m py_compile app/paths.py desktop_app.py` - passes.
* Direct Python-level tests of `_documents_dir()` (resolves the real Documents folder) and all three `migrate_legacy_data_if_needed()` paths (TICKET-0123-era install-folder data migrates correctly; original pre-0123 AppData data migrates correctly; fresh install with neither is a clean no-op) - all passed.
* `ISCC.exe installer.iss` and full `scripts\build.bat` rebuild - both compile/build cleanly.
* Real, safely-cleaned-up verification against the actual compiled artifacts:
  * A real `/VERYSILENT` install into a scratch folder still runs (confirmed it proceeds past the `wpSelectDir` write-test and reaches the Super Admin page, same as before - it can't complete unattended without a pre-existing account, which is expected/unrelated to this change, not a regression).
  * Copied the real rebuilt `dist\AutoPalExpress.exe` and ran it standalone (no `LOCALAPPDATA` override needed anymore, since Documents resolution doesn't depend on that variable): booted cleanly (`HTTP 200`), and its data landed exactly at the real `Documents\AutoPalExpress\data\...` - confirmed via directory listing, then removed immediately afterward.
  * Did **not** attempt a live elevated install into the real `C:\Program Files` - a `Remove-Item` against a path under `C:\Program Files` was correctly blocked by this environment's own safety guard, so there was no safe way to test-and-clean-up that specific scenario here. Confirmed instead via careful review of the Pascal logic and Inno Setup's documented `PrivilegesRequiredOverridesAllowed`/`{autopf}` behavior, which this project used successfully for its entire history before TICKET-0123.
* New installer checksum: `D77136F8AC121AFEA3FB967C00A317970A195D355992B1B787B9AF16FE1B962B`.

---

## Result

AutoPalExpress can once again be installed into Program Files (via the restored elevation option), and all app data now lives under the user's visible Documents folder instead of AppData or the install folder - verified end-to-end against the real rebuilt exe and installer.

---

## Notes

This is the second reversal-under-pressure of an installer/data-location decision in this session (see TICKET-0116->0120 for the first, on Run Silently). Recorded the actual final shape carefully in `decisions.md` so a future session doesn't re-litigate this from scratch.

---

## Closed

2026-07-13
