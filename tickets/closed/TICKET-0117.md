# TICKET-0117

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

Follow-up to TICKET-0116: the user tested Run Silently on the built installer and reported the AutoPalExpress console window was left **minimized**, not truly gone - not the "stealth"/headless behavior asked for.

Root cause: `desktop_app._apply_run_silently()` tried to hide the *already-existing* console window in place via `ShowWindow(hwnd, SW_HIDE)`. That's not reliable in practice - confirmed by the user's own test that it can leave the window minimized in the taskbar instead of fully removed (Windows Terminal, the modern default console host on Windows 11, manages its own window somewhat independently of the classic console `HWND` `GetConsoleWindow()` returns, so a hide request aimed at that handle doesn't always fully take).

---

## Reason

Direct user report that Run Silently didn't actually deliver "headless" - windows were only minimized, still visible/reachable in the taskbar.

---

## Implementation Plan

* [x] Replaced the hide-in-place approach with the same mechanism already proven reliable for Palworld's own window: `CREATE_NO_WINDOW` prevents a console from ever being allocated at all, rather than trying to hide one after the fact. Since AutoPalExpress's own console already exists by the time its code starts running (PyInstaller's `console=True` bootloader allocates it before any Python runs), the only way to get this is to relaunch as a fresh, detached process with that flag set, then have the original (briefly-visible) process exit immediately.
* [x] New `desktop_app._relaunch_silently_if_needed()`: checks the setting, and if enabled, spawns `[sys.executable, *sys.argv[1:]]` with `creationflags=subprocess.CREATE_NO_WINDOW` and an environment guard flag, then returns `True` so `main()` exits without doing anything else. The relaunched child re-enters `main()`, sees the guard flag already set, and proceeds normally (tee logging, port check, browser open, uvicorn) - just with no console ever allocated for it.
* [x] Removed the old `_apply_run_silently()` (`ShowWindow`-based) entirely.
* [x] Verified the state machine directly with mocked `subprocess.Popen`: off -> no relaunch; already-relaunched (env guard set) -> no second relaunch even with the setting on (no infinite loop); on and not yet relaunched -> spawns with the exact expected flags and env.
* [x] Rebuilt the packaged executable and installer with this fix.

---

## Files Modified

* `desktop_app.py`

---

## Testing

* `python -m py_compile desktop_app.py` - passes.
* Verified `_relaunch_silently_if_needed()` directly against three mocked scenarios (setting off, already-relaunched guard, setting on) - all three behave as designed, including the exact `creationflags`/env passed to `Popen`.
* Rebuilt via `scripts\build.bat` - all three build steps completed successfully. New installer checksum: `6C42EFB77D337B4BC79D1D1E70560C2D1B3C81458C2BDCD568917BA20B68BF36`.
* Not tested: an actual restart with the toggle on to confirm the window is now fully gone rather than minimized (no interactive desktop in this environment) - this needs a real test on the user's machine, same as TICKET-0116 originally.

---

## Result

Fixed and rebuilt (checksum above; README and `installer_output/CHECKSUMS.txt` updated to match). Run Silently now uses the same relaunch-with-`CREATE_NO_WINDOW` mechanism proven reliable for Palworld's own window, instead of trying to hide AutoPalExpress's already-existing console in place.

---

## Notes

Palworld's side of Run Silently was never affected by this bug - `process_manager.py`'s `CREATE_NO_WINDOW` launch flag is the same proven mechanism this fix now also uses for AutoPalExpress's own window, and was already confirmed reliable back in TICKET-0019. Only AutoPalExpress's own window needed this fix.

There's still one unavoidable side effect worth knowing: relaunching means the *original* launcher process's console still exists as a real console window for a brief moment (created by the PyInstaller bootloader before any Python code runs) before it exits - a very brief flash, not a persistent minimized window. This is a different, much smaller cosmetic gap than the bug just fixed.

---

## Closed

2026-07-13