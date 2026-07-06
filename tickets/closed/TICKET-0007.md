# TICKET-0007

**Status**

Closed

**Type**

Bug

**Priority**

Medium

**Created**

2026-07-06

---

## Description

The Dashboard's CPU% for the running server didn't match what Windows Task Manager shows for the same process.

## Reason

`process_manager._tree_cpu_ram()` summed `psutil.Process.cpu_percent(interval=0.1)` across the PalServer process tree (the launcher plus its real game-process child), but never divided by the machine's core count. psutil's `cpu_percent()` is relative to a *single* core (100% = one core fully busy) by default; Task Manager normalizes to *all* logical cores (100% = the entire CPU maxed out). Without that normalization, the reported percentage is inflated by a factor equal to however many logical cores the machine has - e.g. on a 16-core machine, a process fully using one core would show as ~100% here instead of the ~6% Task Manager would show.

## Implementation Plan

* [x] Divide the summed `cpu_percent` by `psutil.cpu_count()` in `_tree_cpu_ram()` before returning it.

## Files Modified

* `app/services/process_manager.py` - `_tree_cpu_ram()`.

## Testing

Verified directly (no live Palworld server needed for this one - any CPU-bound process tree demonstrates the bug/fix): spawned a child process that fully pegs one CPU core for several seconds, then called `_tree_cpu_ram()` against it. On this dev machine (16 logical cores), it correctly returned ~7% (matching what Task Manager would show for a single core fully busy), rather than the ~100%+ it would have returned before this fix.

## Result

CPU% shown on the Dashboard now matches Task Manager's normalization convention (0-100% relative to the whole CPU), rather than being inflated by the machine's core count.

## Notes

RAM reporting was checked and found already correct - it sums `memory_info().rss` across the same process tree (launcher + real game process), which is the right scope and already matches how Task Manager attributes memory to a process tree; only the CPU side had the normalization bug.

## Closed

2026-07-06
