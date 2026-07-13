# TICKET-0118

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

Follow-up to TICKET-0117: the user tested the relaunch-based Run Silently fix live - toggled it on, stopped and restarted the server - and AutoPalExpress itself failed to start with:

```
ModuleNotFoundError: No module named '_overlapped'
```

deep inside `uvicorn` -> `asyncio.windows_events`'s import chain, immediately after the Run Silently relaunch.

Root cause: PyInstaller onefile builds use an internal environment variable, `_MEIPASS2`, to tell the bootloader "you're a continuation of an already-extracted instance, don't re-extract." `desktop_app._relaunch_silently_if_needed()` (added in TICKET-0117) spawned the relaunched child with `env={**os.environ, ...}` - inheriting `_MEIPASS2` from the already-running parent. The child's bootloader saw that variable already set and assumed it could reuse the parent's extraction instead of doing its own, but the parent's extracted temp layout doesn't actually apply to this new process invocation - so frozen binary extension modules like asyncio's `_overlapped.pyd` couldn't be found.

---

## Reason

Direct user report from a real live test of TICKET-0117 - the fix for "console stays visible" introduced a worse regression: AutoPalExpress failing to start at all when Run Silently is on.

---

## Implementation Plan

* [x] `desktop_app.py`'s `_relaunch_silently_if_needed()`: strip `_MEIPASS2` from the environment dict passed to the relaunched child, forcing it to perform its own independent extraction rather than incorrectly assuming it's a continuation of the parent's.
* [x] Verified directly: set a fake `_MEIPASS2` in the test process's own environment, confirmed the constructed child `env` no longer contains it while the relaunch guard flag is still set correctly.
* [x] Re-ran the full TICKET-0117 verification suite (off / already-relaunched / on) to confirm nothing else regressed.
* [x] Rebuilt the packaged executable and installer with this fix.

---

## Files Modified

* `desktop_app.py`

---

## Testing

* `python -m py_compile desktop_app.py` - passes.
* Verified directly that `_MEIPASS2` is stripped from the relaunched child's environment while the guard flag is preserved; re-ran all three prior relaunch-logic scenarios (off, already-relaunched, on) - all still pass.
* Rebuilt via `scripts\build.bat` - all three build steps completed successfully. New installer checksum: `AFFD93788D714AD813CAE4843B4A9138508E79BDAE8EC46B34BE637CA9E55360`.
* Not tested: an actual restart with Run Silently on to confirm AutoPalExpress now starts successfully as a fully hidden process (no interactive desktop in this environment) - this needs a real test on the user's machine, same as TICKET-0116/TICKET-0117.

---

## Result

Fixed and rebuilt (checksum above; README and `installer_output/CHECKSUMS.txt` updated to match). The relaunched silent process no longer inherits `_MEIPASS2`, so it performs its own independent extraction and should start normally.

---

## Notes

This is the second real bug found in Run Silently from the user's own live testing (after TICKET-0117), both stemming from Windows/PyInstaller-specific behavior that can't be fully verified without a real Windows desktop session running the packaged build - worth a careful real test of the full on/off/restart cycle before considering this feature done.

---

## Closed

2026-07-13