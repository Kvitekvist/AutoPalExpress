# TICKET-0133

**Status**

Closed

**Type**

Enhancement

**Priority**

Medium

**Created**

2026-07-14

---

## Description

Two installer requests:

1. Right after the installer finishes, proactively create `Documents\AutoPalExpress\` with a visible `Servers` subfolder inside it - confirmed with the user this should also become the real default location new Palworld server deployments go into (not just a decorative empty folder), replacing the less-discoverable `Documents\AutoPalExpress\data\servers`. The app's own internal state (accounts, `instances.json`, mods records, sessions, logs) stays in `data\` exactly as it is now - only the *default deploy target* for brand-new servers changes. Existing already-deployed servers are untouched; this only affects where new ones land by default (a super admin can still choose a different install location per-deploy, as already supported).
2. The installer's Finished page currently still offers a "Launch AutoPalExpress" checkbox even on a fresh install, where `RunFirstTimeSetup` (run during `ssPostInstall`, to apply the seed file) already launched the app automatically - redundant and confusing ("didn't I already say start?"). Should only show/offer that launch step when the app *wasn't* already auto-launched (i.e., an update/reinstall where nothing needed seeding, since `RunFirstTimeSetup` is skipped entirely in that case and remains the only way to conveniently relaunch after Setup finishes).

---

## Reason

Direct user request: create the Documents\AutoPalExpress\Servers folder proactively at install time rather than waiting for the app to lazily create it on first deploy, and stop asking to launch the app when it's already running.

---

## Implementation Plan

* [x] `app/paths.py`: added `default_servers_dir()` - resolves to `Documents\AutoPalExpress\Servers` when frozen (unchanged `data/servers` in dev mode).
* [x] `app/services/deploy_jobs.py`: `install_dir_for()`'s default parent changed from `data_dir() / "servers"` to `paths.default_servers_dir()`.
* [x] `installer.iss`: new `EnsureDataFolders` procedure (called at `ssPostInstall` alongside `SaveStartupRecoverySettings`) that `ForceDirectories`'s both `{userdocs}\AutoPalExpress` and `{userdocs}\AutoPalExpress\Servers` so they exist immediately after install.
* [x] `installer.iss`: added `AppAlreadyLaunched: Boolean`, set True right after `RunFirstTimeSetup`'s `Exec` succeeds; new `ShouldOfferLaunch()` function used as the `[Run]` section's launch entry's `Check:`, suppressing the redundant "Launch AutoPalExpress" step on the Finished page whenever the app was already auto-launched (a fresh install). An update/reinstall with an existing account (where `RunFirstTimeSetup` is skipped entirely) still offers it normally.
* [x] Verified with `py_compile`, a full rebuild, and a real, complete, GUI-automated fresh-install test.

---

## Files Modified

* `app/paths.py`
* `app/services/deploy_jobs.py`
* `installer.iss`

---

## Testing

* `python -m py_compile app/paths.py app/services/deploy_jobs.py app/services/native_dialog.py` - passes.
* Full rebuild via `scripts\build.bat` succeeded.
* Real, complete, GUI-automated fresh-install test against the actual compiled installer (driving every wizard page, same technique as TICKET-0132): confirmed the Finished page showed **no launch checkbox at all** ("Click Finish to exit Setup" only, since `RunFirstTimeSetup` had already launched the app), and after clicking Finish, `Documents\AutoPalExpress\` existed with both `data\` (app state) and an empty `Servers\` folder, with the app responding (`HTTP 200`). All real state this test created was found and removed immediately afterward (including a stray in-progress SteamCMD bootstrap download that ended up under the new `data\steamcmd\` folder from unrelated background app activity during the test, and two lingering installer processes that had to be explicitly killed before a locked log file could be removed).

---

## Result

`Documents\AutoPalExpress\Servers` now exists right after install and is the real default deploy location; the Finished page no longer redundantly asks to launch an app that's already running.

---

## Notes

Existing already-deployed servers under the old `data\servers\<name>` location are not moved - this only changes where brand-new deployments default to.

---

## Closed

2026-07-14
