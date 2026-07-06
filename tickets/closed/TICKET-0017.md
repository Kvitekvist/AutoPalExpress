# TICKET-0017

**Status**

Closed

**Type**

Enhancement

**Priority**

Low

**Created**

2026-07-06

---

## Description

Two small fixes: (1) removed the "(any)" qualifier from `ManualForwardInstructions`' External IP row (just `*`, matching router UI conventions more directly); (2) removed the "Install Mod" manual-entry feature from the Mods page entirely.

## Reason

For (2): the user asked what "Install Mod" did. It turned out to create a bookkeeping-only mod entry (`folderName: null`, no linked files) for mods installed by hand outside the tool - but `ModCard` renders it identically to a real, file-backed mod, so toggling enable/disable on it silently does nothing to any actual files. Confirmed with the user this had no real value as built and should be removed rather than fixed up, since there's no way to make an unmanaged, untracked entry look meaningfully different from a real one without adding real backing (which nobody asked for).

## Implementation Plan

* [x] Removed `(any)` from `ManualForwardInstructions`.
* [x] Removed `POST /api/mods/manual-install` and its request model from `app/routes/mods.py`.
* [x] Removed `modsApi.installMod()`.
* [x] Removed the "Install Mod" button, its dialog, and all related state/handler from `Mods.tsx`; removed now-unused `Dialog`/`Input`/`PlusCircle` imports.

## Files Modified

* `web/src/components/settings/ManualForwardInstructions.tsx`
* `app/routes/mods.py`
* `web/src/api/modsApi.ts`
* `web/src/pages/Mods.tsx`

## Testing

`tsc -b` typechecks clean; `app.main` imports cleanly. Full PyInstaller + Inno Setup rebuild succeeded.

## Result

External IP now reads just `*`. The confusing "Install Mod" placeholder feature is gone entirely - every mod on the Mods page is now guaranteed to be a real, file-backed mod.

## Closed

2026-07-06
