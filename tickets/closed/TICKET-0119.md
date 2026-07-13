# TICKET-0119

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

Follow-up to TICKET-0116/0117/0118: the user reported the exact same `ModuleNotFoundError: No module named '_overlapped'` crash even after the TICKET-0118 `_MEIPASS2`-stripping fix, when toggling Run Silently on, stopping, and restarting.

Rather than attempt a third patch on the same runtime "hide/relaunch an already-console'd process" mechanism - which has now failed twice for two different underlying reasons (unreliable `ShowWindow` hiding in TICKET-0117, `_MEIPASS2` inheritance in TICKET-0118, and apparently still broken by something else after that) - switched to the officially-supported, zero-hack PyInstaller mechanism: **console visibility is a build-time property of an executable, not something changeable at runtime.** Combined with the user's own explicit new request ("i want the installer to ask on upgrade or install if it should launch silently"), this is also the natural place to put the choice.

**New architecture:**

* `PalworldServerAdmin.spec` now builds **two** executables from the same `desktop_app.py` entry point: `PalworldServerAdmin.exe` (`console=True`, default/visible) and `PalworldServerAdminSilent.exe` (`console=False`, genuinely windowed - PyInstaller's own `runw.exe` bootloader, never allocates a console at all).
* `desktop_app.py` reverted to a plain, simple `main()` - no relaunch/env-stripping/ShowWindow logic at all. `_tee_console_streams()` already handled `sys.stdout`/`sys.stderr` being `None` (needed for the windowed variant) since TICKET-0019/0026 - no changes needed there.
* `installer.iss`: new "Run Silently" wizard page, shown on **every install and update** (not skippable, unlike the admin-account setup pages) - asks Show vs. Silent, defaulting to whatever `system_settings.json` already has on an upgrade. Both exes are always installed; `[Icons]`/`[Run]`/`[Registry]` each have a paired visible/silent entry gated by a new `ShouldRunSilently()` Pascal function, so exactly one actually applies. `system_settings.json`'s `runSilently` field is now always written at `ssPostInstall` (previously `SaveStartupRecoverySettings` only wrote when the startup-recovery task was checked - broadened into `SaveSystemSettings`, which also incidentally fixes a latent bug where unchecking "start with Windows" on an update never actually cleared a stale `true`).
* `app/services/system_settings.py`'s `_startup_target()` now prefers `sys.executable` (whichever exe variant is actually running) over a hardcoded filename, so "Start with Windows" always relaunches the same variant currently in use.
* Super Admin's "Run Silently" toggle now only describes/controls **Palworld's own console window** (which was never actually broken - only AutoPalExpress's own window hiding had bugs) - copy updated to point at the installer for AutoPalExpress's own console.

---

## Reason

Two consecutive failed live tests of the runtime hide/relaunch approach, plus a direct user request for an install-time prompt - both point at the same fix.

---

## Implementation Plan

* [x] `PalworldServerAdmin.spec`: two `EXE()` targets from one shared `Analysis`/`PYZ`, one `console=True` one `console=False`.
* [x] `desktop_app.py`: removed `_relaunch_silently_if_needed`/`_SILENT_RELAUNCH_ENV` and all related imports (`os`, `subprocess` no longer needed); `main()` is back to its pre-TICKET-0116 simplicity.
* [x] `installer.iss`: `MyAppExeNameSilent` define; both exes in `[Files]`; paired `Check:`-gated `[Icons]`/`[Run]`/`[Registry]` entries; new `RunSilentlyPage` (shown on install and update); `CurrentRunSilentlySetting()` reads the existing setting to preselect the page's default on upgrade; `ShouldRunSilently()` used by the `Check:` conditions; `SaveSystemSettings` (replacing `SaveStartupRecoverySettings`) always writes all three `system_settings.json` fields; `RunFirstTimeSetup` launches whichever exe was chosen.
* [x] `app/services/system_settings.py`: `_startup_target()` prefers `sys.executable` when frozen.
* [x] `web/src/components/settings/RunSilentlyPanel.tsx`: copy updated to clarify it only controls Palworld's window now, pointing at the installer for AutoPalExpress's own.
* [x] Verified directly and safely: ran the actual built `PalworldServerAdminSilent.exe` against an isolated scratch `LOCALAPPDATA` (not the real app data), confirmed via its `backend.log` that uvicorn started cleanly with no `_overlapped` error, then killed the process and deleted the scratch directory - first time in this whole Run Silently saga this was verified against a real built exe rather than only unit-level mocking.
* [x] Rebuilt the packaged executables and installer.

---

## Files Modified

* `PalworldServerAdmin.spec`
* `desktop_app.py`
* `installer.iss`
* `app/services/system_settings.py`
* `web/src/components/settings/RunSilentlyPanel.tsx`
* `README.md`

---

## Testing

* `python -m py_compile` on all changed backend files - passes.
* `npx tsc --noEmit` on the frontend - passes with no errors.
* Rebuilt via `scripts\build.bat` - both executables and the installer all built successfully; confirmed via the PyInstaller build log that `PalworldServerAdminSilent.exe` used the `runw.exe` (windowed) bootloader, not `run.exe`.
* **Ran the real built `PalworldServerAdminSilent.exe` directly** (not just a unit test) against an isolated scratch `LOCALAPPDATA`, confirmed clean startup (uvicorn running, REST endpoints responding, browser auto-open all worked) via its `backend.log`, then cleaned up the process and scratch directory - the first real executable-level verification in this entire saga, versus needing the user's own machine.
* Not tested: the actual installer wizard page/flow end-to-end (custom Inno Setup Pascal pages can't be driven in this sandbox - same limitation noted for every other custom wizard page added to this project, e.g. TICKET-0018/TICKET-0062) and the Start Menu/shortcut/registry behavior after a real install choosing each option.

---

## Result

Fixed and rebuilt (checksum `D512DB4C484AA791367BF85871A63789D23713FE7421BD2DCF4866BBC69ABB71`; README and `installer_output/CHECKSUMS.txt` updated to match). AutoPalExpress's own console window is now a real install/update-time choice between two natively-built executables, with no runtime hide/relaunch trickery left at all.

---

## Notes

This supersedes TICKET-0116/0117/0118's approach for AutoPalExpress's own console specifically - Palworld's side (the live Super Admin toggle, `process_manager._run_silently_enabled()`/`CREATE_NO_WINDOW`) was never actually broken and is unchanged. A real end-to-end test of the installer wizard and both resulting shortcuts is still worth doing on the user's machine before considering this fully closed, even though the underlying exe-level behavior is now verified directly.

---

## Closed

2026-07-13