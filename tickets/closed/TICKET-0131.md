# TICKET-0131

**Status**

Closed

**Type**

Bug

**Priority**

Critical

**Created**

2026-07-14

---

## Description

User report: clicking "Browse" on the Import Server dialog caused the entire AutoPalExpress window/process to close outright (not a graceful logout, not the Palworld server stopping - the whole app closed).

Root cause: `app/services/native_dialog.py:pick_folder()` creates a `tkinter.Tk()` root and shows a folder picker. Every caller (`instances.py`'s `/import/browse` and `/deploy/browse`, `mods.py`'s UE4SS folder browse, `automation.py`'s save-import browse) invokes it via `asyncio.to_thread(native_dialog.pick_folder, ...)` - meaning `Tk()` gets initialized on a `ThreadPoolExecutor` worker thread, never the process's main thread. Tcl/Tk is not safe to initialize outside the main thread; in a packaged PyInstaller build with uvicorn's asyncio event loop already occupying the main thread, this can bring down the entire process with a low-level, unhandled native crash that bypasses normal Python exception handling entirely - consistent with "the whole window closed" rather than an error toast or a graceful failure.

---

## Reason

Direct user report from live use.

---

## Implementation Plan

* [x] Replaced `native_dialog.pick_folder()`'s tkinter implementation with a short-lived PowerShell subprocess showing `System.Windows.Forms.FolderBrowserDialog` instead - avoids the threading problem entirely (a subprocess has its own real main thread), and matches this project's existing pattern of shelling out to PowerShell for other native Windows integration (`firewall.py`, `diagnostics.py`), rather than embedding a GUI toolkit directly in the backend process.
* [x] Kept the exact same `pick_folder(title: str, initial_dir: str | None = None) -> str | None` signature so none of the four call sites needed to change.
* [x] Verified with `py_compile` and two real invocations (not just reading the code).

---

## Files Modified

* `app/services/native_dialog.py`

---

## Testing

* `python -m py_compile app/services/native_dialog.py` - passes.
* Two real, live invocation tests, each calling `pick_folder()` via `asyncio.to_thread` exactly like the real route handlers do (not just synchronously in a test's main thread, since that wouldn't reproduce the original bug):
  * Cancel path: launched, confirmed the real "Browse For Folder" dialog appeared (found via `EnumWindows`), closed it via `WM_CLOSE` - returned `None` cleanly.
  * Select path: launched with `initial_dir="C:\Windows"`, clicked the dialog's real OK button via `BM_CLICK` (`GetDlgItem`/`SendMessage`, bypassing SendKeys focus issues) - returned the correct path `C:\Windows`.
  * Neither run crashed the Python process, confirming the fix.
* Full rebuild via `scripts\build.bat` succeeded.
* New installer checksum: `BB64DE66133DF658467C856419CDF9DC081C36E6D228E7A6E611983E8D6CFE1D`.

---

## Result

All four Browse buttons (Import Server, deploy-location, UE4SS Mods folder, save-import) now use a PowerShell-based folder picker that can't crash the whole app - verified with real live dialog interactions, not just code review.

---

## Notes

None of the four call sites (`instances.py` x2, `mods.py`, `automation.py`) needed changes - the fix is fully contained in `native_dialog.py`.

---

## Closed

2026-07-14
