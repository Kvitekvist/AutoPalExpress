# TICKET-0088

**Status**

Closed

**Type**

Bug

**Priority**

Critical

**Created**

2026-07-12

---

## Description

Resolve Nexus Mods' review findings: API requests identify release 1.0.5 as version 1.0.0, and a normal authenticated admin can call the mod-update endpoint and make Nexus downloads with the super admin's saved key.

---

## Implementation Plan

* [x] Bumped both the Nexus `Application-Version` header and installer source to 1.0.6.
* [x] Added `require_super_admin` to the previously exposed installed-mod update route; audited all saved-key and download-link call sites.
* [x] Added a route-dependency regression check covering file listing, direct install, installed-mod update, wishlist approval, and wishlist denial.
* [x] Updated README, Getting Started, Nexus description, changelog, architecture, project memory, and ticket memory.

---

## Reported By

Nexus Mods Support during application review on 2026-07-12.

---

## Testing

* Python compilation passed for the modified backend modules.
* Route introspection confirmed all five keyed/download-affecting routes carry `require_super_admin`.
* Header assertion confirmed `Application-Version: 1.0.6` and source inspection confirmed `installer.iss` also declares 1.0.6.
* Frontend production build passed.

---

## Result

Normal admins can no longer make requests using the super admin's saved Nexus key. The next release source consistently identifies itself as 1.0.6.

---

## Closed

2026-07-12
