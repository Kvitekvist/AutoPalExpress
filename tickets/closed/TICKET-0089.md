# TICKET-0089

**Status**

Closed

**Type**

Feature

**Priority**

High

**Created**

2026-07-12

---

## Description

Allow normal admins to add publicly browsed Nexus mods to the active server's wishlist. Add a Mod Wishlist tab under Super Admin where the host can approve or deny each request. Only approval may use the super admin's saved Nexus Premium key and install the mod.

---

## Implementation Plan

* [x] Added per-instance `mod_wishlist.json` persistence.
* [x] Added an authenticated request endpoint that stores public metadata and constructs the canonical Nexus URL server-side without reading the Nexus session.
* [x] Added Add to Wishlist/Requested states and duplicate suppression.
* [x] Added Host Controls and Mod Wishlist tabs under Super Admin, with approve and deny actions.
* [x] Kept approval and installation explicitly super-admin-only.
* [x] Routed all new UI copy through i18n with safe English defaults and updated public/project documentation.
* [x] Verified backend authorization/storage and the frontend production build.

---

## Security Boundary

Creating a request stores public metadata only. It must never read the Nexus session, list downloadable files, request a download link, or write into the server's Mods directory. Those operations remain super-admin-only.

---

## Testing

* Python compilation passed for wishlist storage and routes.
* Direct storage checks confirmed add, duplicate suppression, lookup, and removal.
* Authorization dependency checks confirmed approve and deny are super-admin-only.
* `npm.cmd run build` passed.
* A live Nexus approval/download was deliberately not run because it would install a real mod into the active server.

---

## Result

Regular admins can request mods without using the host's saved credential. The super admin reviews each active-server request in its own tab and explicitly authorizes an install by clicking Approve.

---

## Closed

2026-07-12
