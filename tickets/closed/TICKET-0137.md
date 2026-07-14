# TICKET-0137

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

User report: "Run Diagnostics as Admin" failed with "Windows didn't allow diagnostics to run with admin rights - click 'Yes' on the permission prompt and try again."

Root cause: `diagnostics._run_elevated()` built its `Start-Process -Verb RunAs -ArgumentList` command as one hand-assembled string with doubled quotes (`""{script}""`) around each path. This silently truncates any argument at its **first space** with no error - confirmed live with a probe script that any path segment after the first space gets dropped entirely and leaks as unrelated positional arguments. Separately (and this is the part that actually broke elevation specifically), even switching to a proper PowerShell array literal for `-ArgumentList` wasn't enough: `Start-Process -Verb RunAs` uses `ShellExecuteEx` internally, which - unlike the same cmdlet's normal (non-elevated) `CreateProcess` path - does **not** auto-quote array elements containing spaces; it just naively space-joins them before handing the result to Windows.

Every path this function passes (`script`, `data_dir`, `report_dir`) had never actually contained a space until today - `install_dir()` defaulted to a per-user location with no space in it, and `Documents\AutoPalExpress\...` doesn't have one either. TICKET-0136 (Program Files as the default install location, always containing a space) exercised this latent bug for the first time, breaking it for every fresh install.

---

## Reason

Direct user report, immediately after TICKET-0136 shipped.

---

## Implementation Plan

* [x] `app/services/diagnostics.py`: `_run_elevated()` now builds `-ArgumentList` as a real PowerShell array literal, and wraps each path-carrying element (`script`, `data_dir`, `report_dir`) in a new `_ps_path_arg()` helper that embeds literal double quotes inside the array element's own content - the actual fix for the `ShellExecuteEx`/`-Verb RunAs` quoting gap, confirmed by direct experimentation (the array-only fix alone still failed identically; embedding quotes in the element content is what actually worked).
* [x] Verified `_run_limited()` (the non-elevated fallback) doesn't share this bug - it already used `subprocess.run()`'s list form, which Python quotes correctly on its own.

---

## Files Modified

* `app/services/diagnostics.py`

---

## Testing

* `python -m py_compile app/services/diagnostics.py` - passes.
* Reproduced the exact regression first: a probe `.ps1` script (writing its received parameters to a file) confirmed the original code truncated a space-containing `DataDir` at the first space, and separately that even an array-form `-ArgumentList` combined with `-Verb RunAs` still failed identically (exit code `4294770688`) until the embedded-quotes fix was applied.
* Confirmed the fix directly against the real `diagnostics._run_elevated()` function with paths shaped exactly like the real Program Files scenario (the diagnose script's own path containing a space) - returned `True`, and the elevated child process received the complete, correct, space-intact paths with no stray arguments.
* All probe/scratch test files removed after verification.

---

## Result

`Run Diagnostics as Admin` (and the regular best-effort `Run Diagnostics`, which shares the same elevation helper) now correctly elevates regardless of whether the install path, Documents path, or diagnose script path contains spaces.

---

## Notes

This is the second latent argument-quoting bug this session exposed only once Program Files (with its guaranteed space) became a real, exercised code path - worth remembering as a class of risk: any hand-built Windows command-line string embedding a path should be tested against a space-containing path specifically, not just whatever paths happened to be in use during development.

---

## Closed

2026-07-14
