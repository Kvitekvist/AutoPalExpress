# TICKET-0115

**Status**

Closed

**Type**

Feature

**Priority**

Medium

**Created**

2026-07-13

---

## Description

Dashboard's CPU and RAM `StatTile`s currently show one progress bar each, and both are actually **Palworld-process-only** metrics already (confirmed via `app/services/process_manager.py`'s `_process_cpu_ram()`, which sums only the matched `PalServer.exe`/`PalServer-Win64-Shipping-Cmd.exe` process tree, normalized across all cores per TICKET-0007). RAM's bar denominator (`ramTotalGB`) is already whole-system total capacity, but the numerator is still Palworld-only usage - there's currently no "how loaded is this whole machine right now" metric anywhere in the API at all.

Add a second bar to each tile:

* **CPU tile**: existing bar (Palworld's own CPU%, unchanged) + a new bar for the machine's total current CPU load (`psutil.cpu_percent()` system-wide, not scoped to any process tree).
* **RAM tile**: existing bar (Palworld's own RAM used, unchanged) + a new bar for the machine's total current RAM used (`psutil.virtual_memory().used`/`.percent`), out of the same total capacity already shown.

---

## Reason

Direct user request: the host wants to see both "how much is Palworld itself using" and "how loaded is the whole server right now" side by side, since a machine can be under heavy load from something other than Palworld and the current single bar can't show that.

---

## Implementation Plan

* [x] `app/routes/server_control.py`: added a `_system_load()` helper (`psutil.cpu_percent(interval=None)` - the correct non-blocking usage for a polling loop like this one, since it reports the delta since the last call - and `psutil.virtual_memory().used`) merged into `_status_view()`'s return in both the no-instance and active-instance branches, so system load shows even with no server selected. Reuses the existing `ramTotalGB` as the denominator for both RAM bars, as planned. (Ended up not needing any change in `process_manager.py` for this specific ticket - the system-wide numbers don't depend on any particular process tree, so they fit naturally alongside the existing `psutil.virtual_memory().total` call already in `server_control.py`.)
* [x] `web/src/types/models.ts`: added `systemCpuPercent`/`systemRamUsedGB` to `ServerStatus`.
* [x] `web/src/pages/Dashboard.tsx`: both tiles now render two `ManaProgressBar`s, using the component's existing `label`/`valueLabel` props ("Palworld" / "System") - no `StatTile` changes needed.
* [x] Labels: went with "Palworld" / "System". Headline `value` stays Palworld-only, matching the recommendation.

---

## Files Modified

* `app/routes/server_control.py`
* `web/src/types/models.ts`
* `web/src/pages/Dashboard.tsx`

---

## Testing

* `python -m py_compile` on `server_control.py` - passes.
* `npx tsc --noEmit` on the frontend - passes with no errors.
* Not tested: an actual live comparison of Palworld-only vs system-wide numbers on a real running server (no real Palworld process in this environment) - the two code paths were verified by reading, not observed side by side.

---

## Result

Both CPU and RAM tiles on Dashboard now show two bars: Palworld's own usage (unchanged from before) and the whole machine's current load, sharing the same total-capacity denominator for RAM.

---

## Notes

Ticket created per explicit user request; implementation deliberately not started yet.

---

## Closed

2026-07-13