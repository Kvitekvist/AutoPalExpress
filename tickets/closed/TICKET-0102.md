# TICKET-0102

**Status**

Closed

**Type**

Documentation

**Priority**

Low

**Created**

2026-07-12

---

## Description

Now that TICKET-0101 replaced every screenshot placeholder with a real image, the user asked to remove the leftover italic placeholder captions (e.g. *"(Screenshot placeholder - a full view of the Dashboard page)"*) that ran under each image, in both the in-repo `wiki/` docs and the live GitHub Wiki.

---

## Implementation Plan

* [x] Stripped every `*(Screenshot placeholder ...)*` caption line from all 9 pages in the main repo's `wiki/` folder, leaving each real image in place with no leftover placeholder text or stray blank lines.
* [x] Did the same in a fresh clone of `AutoPalExpress.wiki.git`'s 9 pages.
* [x] Committed and pushed both.

---

## Files Modified

* `wiki/dashboard.md`, `wiki/mods.md`, `wiki/server-control.md`, `wiki/world-settings.md`, `wiki/logs.md`, `wiki/mod-wishlist.md`, `wiki/launcher-options.md`, `wiki/settings.md`, `wiki/super-admin.md` (main repo)
* `AutoPalExpress.wiki.git`: same 9 pages (separate repo, not part of this repo's tree)

---

## Testing

* `grep -l "Screenshot placeholder" *.md` returned no matches in either location after the edit.
* Spot-checked a page for stray double blank lines left behind by the removal - none found.

---

## Result

Every wiki page now shows only the real screenshot with no leftover placeholder caption underneath it, in both the in-repo docs and the live GitHub Wiki.

---

## Closed

2026-07-12
