# TICKET-0076

**Status**

Closed

**Type**

Bug

**Priority**

High

**Created**

2026-07-11

---

## Description

Fix the in-app diagnostics button failing with "you may have declined the permission prompt" instead of producing a useful report.

---

## Reason

The user tried the new Super Admin diagnostics button and got only an error toast saying diagnostics did not run. The current implementation treats any UAC/elevation failure as a hard stop, even though the diagnostics script can still produce a useful non-admin report with a clear warning that firewall inspection may be incomplete.

---

## Implementation Plan

* [x] Try the elevated diagnostics run first.

* [x] If elevation fails or is declined, run the same diagnostics script without elevation instead of failing immediately.

* [x] Include a warning in the returned report so support can see that the fallback path was used.

* [x] Verify backend/frontend builds.

* [x] Update changelog and memory.

---

## Files Modified

* `app/services/diagnostics.py`
* `CHANGELOG.md`
* `.claude/memory/project_memory.md`
* `.claude/memory/ticket_memory.md`

---

## Testing

* Passed: `.venv312\Scripts\python.exe -m compileall app`
* Passed: `npm.cmd run build`
* Passed: forced fallback smoke test by monkeypatching `diagnostics._run_elevated` to return `False`; confirmed `diagnostics.run()` returned a report path, a warning note, and report text.

---

## Result

The Super Admin diagnostics button should now return a limited report even when Windows blocks or declines the elevated helper. The report clearly notes that firewall inspection may be incomplete.

---

## Closed

2026-07-11
