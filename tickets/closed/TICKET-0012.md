# TICKET-0012

**Status**

Closed

**Type**

Enhancement

**Priority**

Medium

**Created**

2026-07-06

---

## Description

Two requested changes: (1) lock the entire Settings tab behind super admin access, matching how the Super Admin tab already works; (2) move the UE4SS mod loader panel out of Settings and into the Mods page, so it stays available to regular admins even though Settings no longer is.

## Reason

Follows directly from TICKET-0009's access-control work: Settings already held mostly super-admin-relevant controls (user/invite management, server instance provisioning, mods-path override). Locking the whole tab (nav-hidden + route-guarded, same pattern as `/super-admin`) is simpler and more consistent than the previous mix of page-level-visible-to-all with some panels individually role-checked inside. UE4SS installation is regular day-to-day mod management, not a provisioning/credential concern, so it needed to move somewhere still reachable by regular admins rather than become collateral damage of locking Settings.

## Implementation Plan

* [x] `Sidebar.tsx`: added `superAdminOnly: true` to the Settings nav item (already-existing mechanism, same as Super Admin).
* [x] `App.tsx`: wrapped the `/settings` route in the existing `RequireSuperAdmin` guard (redirects non-super-admins to `/`), same as `/super-admin`.
* [x] `Settings.tsx`: removed the now-redundant `user.role === "super_admin"` check around `UsersPanel` (the whole page is gated now) and removed `Ue4ssPanel`.
* [x] Moved `Ue4ssPanel.tsx` from `components/settings/` to `components/mods/` (matches the project's folder-per-feature convention) and rendered it on the Mods page instead.
* [x] Simplified `InstanceManagerPanel.tsx` back to unconditional rendering - the per-button `isSuperAdmin` checks added in TICKET-0009 are now genuinely unreachable dead code, since no non-super-admin can reach this component's containing page at all anymore. The backend's own `require_super_admin` dependencies (TICKET-0009) remain the actual security boundary regardless.
* [x] Mods page's "No Mods folder configured" banner now shows a working link to Settings only for the super admin, and a plain "ask the super admin" message otherwise (the link would have 404'd/bounced a regular admin now that Settings is gated).

## Files Modified

* `web/src/components/layout/Sidebar.tsx`
* `web/src/App.tsx`
* `web/src/pages/Settings.tsx`
* `web/src/pages/Mods.tsx`
* `web/src/components/mods/Ue4ssPanel.tsx` (moved from `components/settings/`)
* `web/src/components/settings/InstanceManagerPanel.tsx` (simplified, no longer needs role checks)

## Testing

`tsc -b` typechecks clean after the move and all edits. `app.main` imports cleanly (no backend changes in this ticket). Full PyInstaller + Inno Setup rebuild succeeded.

## Result

Settings is now exclusively reachable by the super admin (hidden from nav, redirects if navigated to directly). UE4SS management remains available to all admins, now under Mods.

## Notes

Direct follow-up to TICKET-0009's access-control boundary.

## Closed

2026-07-06
