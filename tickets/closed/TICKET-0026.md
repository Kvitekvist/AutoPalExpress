# TICKET-0026

**Status**

Closed

**Type**

Bug

**Priority**

High

**Created**

2026-07-07

---

## Description

Fix packaged startup crash after restoring the visible AutoPalExpress console window.

---

## Reason

The `_Tee` wrapper used to copy stdout/stderr to `backend.log` did not implement `isatty()`. Uvicorn's logging formatter checks `sys.stderr.isatty()` while configuring colored console logs, so the packaged app crashed before startup.

---

## Implementation Plan

* [x] Make `_Tee` expose stream-like console methods and attributes expected by logging.

* [x] Rebuild the distributable installer.

* [x] Update ticket memory.

---

## Files Modified

* `desktop_app.py`
* `.claude/memory/ticket_memory.md`

---

## Testing

* [x] Rebuilt the frontend and packaged installer successfully.

* [x] Ran a focused Uvicorn logging smoke test with `sys.stderr` wrapped in `_Tee`; logging config now succeeds.

---

## Result

The packaged app's console tee now behaves like a real stream for Uvicorn logging while still copying output into `backend.log`.

---

## Notes

No change to the Palworld server window behavior.

---

## Closed

2026-07-07
