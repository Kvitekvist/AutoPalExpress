# TICKET-0030

**Status**

Closed

**Type**

Bug

**Priority**

High

**Created**

2026-07-08

---

## Description

Dashboard CPU and RAM tiles can show the wrong live values for a running Palworld server. The screenshot shows CPU at 0% and low RAM while Windows Task Manager shows active usage, and tick-rate milliseconds may also be misleading when the REST metrics payload does not expose the expected value.

---

## Reason

`process_manager` only samples the process tree rooted at the launcher process it started in the current backend session. Palworld can run the actual server work in `PalServer-Win64-Shipping-Cmd.exe`, and already-running or detached processes are not adopted by the in-memory process table. That makes local CPU/RAM drift away from Task Manager even when the server is genuinely online.

---

## Implementation Plan

* [x] Discover matching Palworld server processes by executable name and server folder when the tracked launcher tree is incomplete.
* [x] Keep CPU normalized to Task Manager's whole-machine convention while summing RAM across the discovered process set.
* [x] Make tick-rate display tolerate missing REST frame-time metrics without pretending a measured 0 ms is available.
* [x] Update project records and verify backend/frontend builds.

---

## Files Modified

* `app/services/process_manager.py`
* `app/routes/server_control.py`
* `web/src/pages/Dashboard.tsx`
* `web/src/types/models.ts`
* `README.md`
* `CHANGELOG.md`
* `.claude/memory/project_memory.md`
* `.claude/memory/architecture.md`
* `.claude/memory/decisions.md`
* `.claude/memory/ticket_memory.md`
* `tickets/TICKET-0030.md`

---

## Testing

* `npm.cmd run build`
* `py -3.12 -m compileall app\services\process_manager.py app\routes\server_control.py`

---

## Result

Dashboard CPU/RAM now samples the selected instance's real Palworld processes by server folder, including the worker executable, instead of depending only on the remembered launcher process tree. Missing REST frame-time metrics now render as unavailable rather than `0 ms`.

---

## Notes

---

## Closed

2026-07-08
