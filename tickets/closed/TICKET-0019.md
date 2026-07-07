# TICKET-0019

**Status**

Closed

**Type**

Enhancement

**Priority**

Medium

**Created**

2026-07-07

---

## Description

Running the app used to show two separate floating OS console windows: one for the admin backend itself (a visible console showing uvicorn/Python logs), and one that Palworld's own dedicated server process creates for itself the moment it starts. Both are now suppressed - the browser tab is the only window the user ever sees, whether the admin tool is idle or actively running a game server.

## Reason

User asked whether the Palworld server's own command-line window and the admin tool's own command-line window could both live inside "one nice GUI" instead of two floating windows.

## Investigation

Did real, live testing against an actual installed Palworld dedicated server (the dev machine's `TestServer1` instance) before writing any code, since the two windows have different owners and needed different, non-obvious fixes:

* **The admin tool's own console** is fully within our control - a straightforward PyInstaller packaging setting.
* **Palworld's own console is not simply "captured."** Confirmed empirically (real process launched, real `Get-Process` window checks, twice): PalServer.exe (the launcher) spawns a grandchild, `PalServer-Win64-Shipping-Cmd.exe`, which is the actual game server - and *that* process allocates its own console independent of how the launcher itself was started. Piping the launcher's stdout captured zero lines even after a 40-second wait with the server fully up and genuinely saving world data - Palworld writes through its own low-level console API, not the standard stdout handle, and doesn't write a persistent log file either (tested with `-log` passed explicitly; `Pal/Saved/Logs/` stayed empty across multiple real runs). So real console *content* can't be captured this way - it would need reading the game's own hidden console screen buffer directly, a much more invasive approach not attempted here.
* What *does* work, confirmed live: launching with `CREATE_NO_WINDOW` suppresses the **entire** process tree's window - launcher, grandchild, and the `conhost.exe` Windows creates to host the console are all confirmed to have `MainWindowHandle == 0` (no visible window at all), even though the console still technically exists in the background.

Given real content-capture isn't feasible without much greater risk/complexity, the shippable, low-risk outcome is: suppress both windows entirely, and leave the "Logs" page (already documented as mocked, unrelated to this ticket) as a separate future consideration if real log capture is ever wanted via the harder console-buffer-reading approach.

## Implementation Plan

* [x] `app/services/process_manager.py`: `start()`'s `subprocess.Popen` now passes `CREATE_NO_WINDOW` (in addition to the existing `CREATE_NEW_PROCESS_GROUP`, needed for `CTRL_BREAK_EVENT` on stop) and redirects stdout/stderr/stdin to `DEVNULL` instead of inheriting a console - piping them would just be an unread buffer, since nothing meaningful comes through that channel (see Investigation).
* [x] `PalworldServerAdmin.spec`: `console=False` - the admin backend no longer shows its own window; the browser tab it opens is the only UI.
* [x] `desktop_app.py`: a windowed PyInstaller build has `sys.stdout`/`sys.stderr` as `None` (no console to attach to) - anything writing to them (print, the logging module's default handler, uvicorn's own internal logging) would crash the instant it's first used. Added `_redirect_console_streams()`, redirecting both to a real file (`data_dir()/backend.log`) before uvicorn or the app is imported, so every one of those keeps working unmodified. Also wrapped startup in a try/except that logs the traceback to that same file and shows a native `MessageBoxW` pointing at it, so a startup failure isn't silently invisible now that there's no console to show a crash in.

## Files Modified

* `app/services/process_manager.py`
* `PalworldServerAdmin.spec`
* `desktop_app.py`

## Testing

All live, not just read-through:

* Launched the real `TestServer1` instance directly with the new flags three times while investigating, checking `Get-Process ... MainWindowHandle` each time - confirmed `HasWindow: False` across the whole process tree (launcher, grandchild, conhost).
* Re-verified through the actual integrated `process_manager.start()`/`stop()` functions (not just a standalone repro script) against the same real instance - same result.
* Rebuilt the full installer (`build_installer.ps1`); confirmed PyInstaller used the windowed bootloader (`runw.exe`, not `run.exe`) once `console=False` took effect.
* Ran the actual packaged `dist/PalworldServerAdmin.exe` directly (not just in dev mode): confirmed no window appears for either of its two processes (PyInstaller onefile's own bootloader + the real embedded interpreter, both normal to see for a onefile build), confirmed a real HTTP request against it succeeds (`GET /api/auth/status` -> 200), and confirmed `backend.log` correctly receives both uvicorn's and the app's own log output - proving the stdout/stderr redirect actually protects everything it needs to.
* Cleaned up every process spawned during this investigation (including two stragglers left running from an earlier exploratory test that didn't yet have its own cleanup code) - verified nothing was left running afterward.

## Result

Starting a server, and running the admin tool itself, no longer show any separate floating console windows - the browser is the only UI, matching what was asked for. Real Palworld console *log content* still isn't surfaced anywhere in the app (that remains future work, tracked as a much harder problem than this ticket's scope - see Investigation).

## Closed

2026-07-07
