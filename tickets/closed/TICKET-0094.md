# TICKET-0094

**Status**

Closed

**Type**

Enhancement

**Priority**

Low

**Created**

2026-07-12

---

## Description

Follow-up UI reorg after TICKET-0089: the Mod Wishlist approval panel was added as a second tab inside Super Admin ("Host Controls" / "Mod Wishlist"), sharing one page. The user asked to give it its own dedicated sidebar entry under the Host Controls section instead, positioned right below the Host Controls divider and above Launcher Options.

---

## Reason

User request, with an annotated screenshot showing the desired sidebar slot (directly under the "Host Controls" section divider, above "Launcher Options") and pointing at the "Mod Wishlist" tab that should move there.

---

## Implementation Plan

* [x] Added a new super-admin-only route `/mod-wishlist` (`web/src/pages/ModWishlist.tsx`) rendering the existing `ModWishlistPanel`, route-guarded the same way as Launcher Options/Settings/Super Admin.
* [x] Added a "Mod Wishlist" entry to the Sidebar's `HOST_ITEMS`, first in the list so it renders directly under the Host Controls divider, above Launcher Options.
* [x] Reverted `SuperAdmin.tsx` back to a single, non-tabbed page (removed the `AncientTabs`/`ModWishlistPanel` usage added in TICKET-0089) since the wishlist now lives on its own page.
* [x] Added `nav.modWishlist` and `topbar.pages.modWishlist` translation keys across all 6 locales.
* [x] Updated changelog and ticket memory.

---

## Files Modified

* `web/src/App.tsx`
* `web/src/pages/ModWishlist.tsx` (new)
* `web/src/pages/SuperAdmin.tsx`
* `web/src/components/layout/Sidebar.tsx`
* `web/src/components/layout/TopBar.tsx`
* `web/src/i18n/locales/en.json`, `fr.json`, `es.json`, `de.json`, `ja.json`, `zh-Hans.json`
* `CHANGELOG.md`

---

## Testing

* `npm run build` (tsc + vite) passed.

---

## Result

Mod Wishlist approval now has its own sidebar page under Host Controls, matching the screenshot the user annotated, instead of being a hidden second tab inside Super Admin.

---

## Closed

2026-07-12
