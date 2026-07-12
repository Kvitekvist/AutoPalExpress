# TICKET-0103

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

User asked to update `README.md` and `GETTING_STARTED.md` to reference the new `images/wiki/` screenshots where it makes sense, now that TICKET-0101/0102 have real images and clean pages.

---

## Implementation Plan

* [x] `README.md`: added a "Server Control / World Settings" row to the Screenshots gallery using `images/wiki/server-control-01-overview.png` and `images/wiki/world-settings-01-overview.png` - two core features that had no screenshot in the README before. Added a tip pointing to the GitHub Wiki for a full page-by-page walkthrough.
* [x] `GETTING_STARTED.md`: added a tip near the top pointing to the Wiki for everything beyond first-time setup.
* [x] `GETTING_STARTED.md` step 8 (Add Mods): added `images/wiki/mods-03-install-or-wishlist.png`, illustrating the "Add to Wishlist" button the text already describes but previously had no image for.
* [x] `GETTING_STARTED.md` step 10 (If Something Does Not Work): replaced the reference to `images/getting-started-14-diagnostics.png` - which is described in `TICKET-0059`'s memory as never actually captured - with the real `images/wiki/super-admin-06-diagnostics.png`, and updated the text to also mention the in-app **Run Diagnostics** button on Super Admin (TICKET-0074) alongside the existing Start Menu shortcut.

---

## Files Modified

* `README.md`
* `GETTING_STARTED.md`

---

## Testing

* Confirmed every newly referenced `images/wiki/*.png` file exists on disk (added in TICKET-0101).
* Reviewed the rendered Markdown diff by eye; no build step applies to these changes.

---

## Result

`README.md` and `GETTING_STARTED.md` both link to the Wiki for deeper documentation, and reference real screenshots where it filled an actual gap - including fixing `GETTING_STARTED.md`'s long-standing missing diagnostics screenshot.

---

## Closed

2026-07-12
