# TICKET-0122

**Status**

Closed

**Type**

Enhancement

**Priority**

Medium

**Created**

2026-07-13

---

## Description

Mods installed via Super Admin's "Install From File" (hash-verified manual upload, `POST /api/mods/install-from-file/confirm`) are stored with a real `sourceModId` (the Nexus mod ID the uploaded file's hash matched), the same field Nexus-installed mods use. Because `_with_update_status()` in `app/routes/mods.py` checks every mod with a `sourceModId` for a newer published version with no distinction between the two install paths, a manually-installed mod can show `updateAvailable: true` and the "Request Update" button on its `ModCard`, even though it was never installed through the Nexus download/wishlist pipeline that button triggers.

User wants:
1. "Request Update" hidden entirely for manually-installed mods.
2. A "Manually Added" badge/flag shown on manually-installed mod cards.

---

## Reason

Direct user request. The Request Update path exists to let the super admin approve an automated Nexus download for an already Nexus-installed mod - offering it for a manually-placed file is misleading, since the mod's presence on disk didn't come from that pipeline. A visible "Manually Added" flag also makes it clear at a glance which mods came from a verified upload versus a direct Nexus install.

---

## Implementation Plan

* [x] Backend: both mod-creation code paths already use a distinguishable ID prefix (`mods_store.new_id("nexus")` for Nexus-sourced installs, `mods_store.new_id("verified")` for hash-verified manual uploads) - no new persisted field or migration needed. Derive `manuallyInstalled` from the `verified-` ID prefix at response time in `_with_update_status()`, and exclude those mods from the update-check's `mod_ids` list so `updateAvailable` never becomes true for them.
* [x] Frontend: add `manuallyInstalled: boolean` to the `Mod` type; `ModCard.tsx` shows a "Manually Added" badge next to the version when true, and the existing `mod.updateAvailable &&` guard around Request Update naturally stops firing since the backend never sets it for these mods.
* [x] Verify with `py_compile`/`tsc --noEmit`.

---

## Files Modified

* `app/routes/mods.py`
* `web/src/types/models.ts`
* `web/src/components/mods/ModCard.tsx`

---

## Testing

* `py_compile app/routes/mods.py` - passes.
* `npx tsc --noEmit` - passes with no errors.
* Not tested: an actual browser render (no interactive desktop in this environment) - verified by reading the resulting conditional structure and confirming both mod-creation code paths' id prefixes directly in source.

---

## Result

Manually-installed (verified file upload) mods now always report `manuallyInstalled: true` and are excluded from the Nexus update check, so `updateAvailable` never becomes true for them and "Request Update" never appears on their card. Every mod card also shows a "Manually Added" badge next to the version when it was installed this way, regardless of update status.

---

## Notes

No installer rebuild performed yet (source-only change).

---

## Closed

2026-07-13
