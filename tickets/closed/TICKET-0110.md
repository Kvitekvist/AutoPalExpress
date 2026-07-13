# TICKET-0110

**Status**

Closed

**Type**

Enhancement

**Priority**

Low

**Created**

2026-07-13

---

## Description

Move the "Mod File Uploads" section (super-admin-only "Install From File" - `web/src/pages/SuperAdmin.tsx`'s `ScrollPanel`/`InstallFromFileDialog` trigger) off the Super Admin page and onto the Mod Wishlist page (`web/src/pages/ModWishlist.tsx`, currently just `ModWishlistPanel`), so both mod-installation entry points super admins use - approving a wishlist request and manually installing an already-downloaded file - live in the same place.

`/mod-wishlist` is already `RequireSuperAdmin`-gated in `App.tsx` (same as `/super-admin`), so this is a pure relocation - no access-level change needed.

---

## Reason

User request: "It makes sense to have these in the same location" - both are super-admin mod-installation actions, currently split across two different sidebar pages for no functional reason.

---

## Implementation Plan

* [x] Moved the "Mod File Uploads" `ScrollPanel` (icon, description text, "Install From File" button) and its `InstallFromFileDialog` state/trigger out of `SuperAdmin.tsx` and into `ModWishlist.tsx`, directly (no separate shared component needed - `ModWishlist.tsx` was already just a thin page wrapper).
* [x] `SuperAdmin.tsx` no longer references `UploadCloud`/`InstallFromFileDialog`/`Mod`/`RuneButton` for that section - removed the now-unused imports and `installFromFileOpen` state along with it.
* [x] Ordering: uploads render above `ModWishlistPanel` on the Mod Wishlist page, per the recommendation.
* [x] Left the page/sidebar label as "Mod Wishlist" - not required, and the page's own intro text wasn't changed either since "Mod File Uploads" already carries its own heading/description.
* [x] No translation keys assumed a Super Admin location - `superAdmin.modFileUploads`/`modFileUploadsDescription`/`installFromFileButton` keys were reused as-is (their names are a pre-existing minor mismatch now that they're not under Super Admin, but renaming translation keys with no visible effect wasn't worth the churn).

---

## Files Modified

* `web/src/pages/SuperAdmin.tsx`
* `web/src/pages/ModWishlist.tsx`

---

## Testing

* `npx tsc --noEmit` on the frontend - passes with no errors.
* Not tested: an actual browser click-through of Install From File from its new location (no interactive desktop in this environment) - the dialog component itself is unchanged, only its mount location moved.

---

## Result

"Mod File Uploads" now lives on the Mod Wishlist page, above the wishlist request list. Super Admin no longer shows it.

---

## Notes

Ticket created per explicit user request; implementation deliberately not started yet.

---

## Closed

2026-07-13