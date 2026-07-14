# TICKET-0146

**Status**

Closed

**Type**

Bug

**Priority**

High

**Created**

2026-07-14

---

## Description

Mods placed directly into the server's mods folders by hand (bypassing the app entirely) never showed up in the Mods page's list, even after being copied into what looked like the right folder - the list only ever showed what the app itself had installed and tracked. The Mods page now also scans the real UE4SS and pak mods folders for anything not already tracked and registers it as a normal, manageable mod.

---

## Reason

Direct user feedback (mod-installation report, 2026-07-14): "Manually installed mods (not via the app) do not show up in the app's mod list UI, even when copied into Win64\mods for visibility."

---

## Implementation Plan

* [x] `app/services/ue4ss_installer.py`: added `builtin_mod_names()` - derives the set of UE4SS's own built-in mod folder names (e.g. `BPModLoaderMod`) from this install's own recorded managed paths, so the disk scan below can tell those apart from anything a user actually added, without a hardcoded list that could go stale across UE4SS releases.
* [x] `app/services/mod_installer.py`: added `list_untracked_entries()` - top-level entries in a mods folder not already tracked by folder name and not in an exclude set.
* [x] `app/routes/mods.py`: `get_mods()` now calls a new `_register_untracked_disk_mods()` first - scans both the UE4SS mods folder (excluding UE4SS's own built-ins) and the pak mods folder for anything untracked, and persists each as a normal tracked mod entry with `manuallyInstalled: true`, `status: "enabled"` (since it's already sitting live in the folder). This is a one-time discovery per mod - once registered, it behaves exactly like any other tracked mod (can be enabled/disabled/removed through the app normally).
* [x] Reused the existing `manuallyInstalled` badge (from TICKET-0122's verified-file-upload flagging) instead of adding a new one - `_with_update_status` now respects an already-`true` flag in addition to its `verified-` id-prefix heuristic, and excludes these from the Nexus update check same as verified uploads (no `sourceModId` to check against).

---

## Files Modified

* `app/services/ue4ss_installer.py`
* `app/services/mod_installer.py`
* `app/routes/mods.py`

---

## Testing

* `python -m py_compile` on all three files passes.
* Logic reviewed directly against the existing `enable`/`disable`/`remove` folder-move mechanics in `mod_installer.py`, which operate purely on folder name and don't care whether the app or a person originally created the folder - confirming a discovered mod is fully manageable immediately after being registered, not just visible.
* Not tested through a real live browser session with real manually-placed mod folders (no interactive desktop in this sandbox) - the scan/registration logic itself was reviewed directly rather than exercised end-to-end.

---

## Result

Mods dropped directly into the UE4SS or pak mods folders by hand now show up on the Mods page (tagged "Manually Added") the next time it loads, instead of being permanently invisible to the app.

---

## Closed

2026-07-14
