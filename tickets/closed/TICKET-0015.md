# TICKET-0015

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

Moved the "Install From File" mod-upload feature from the Mods page (where it was conditionally hidden from regular admins) to Super Admin (where it's the page's whole reason to exist).

## Reason

The backend (`app/routes/mods.py`'s `install-from-file/*` endpoints) and the previous frontend (a `user.role === "super_admin"` conditional inside `Mods.tsx`) already restricted this correctly - nothing was actually exposed to regular admins. But the user's underlying concern was about *organization*, not just permission: high-risk, disk-writing, super-admin-only actions shouldn't live as conditionally-hidden bits within a page regular admins also use day-to-day - they should be consolidated into the one page that's already entirely reserved for the super admin, consistent with how port forwarding, firewall rules, and the Nexus connection already work there.

## Implementation Plan

* [x] Added an "Install From File" section (with its own explanation of why it's restricted) to `SuperAdmin.tsx`, rendering `InstallFromFileDialog` there.
* [x] Removed the button, dialog, and now-unused `installFromFileOpen` state from `Mods.tsx`.
* [x] No backend change needed - `install-from-file/*` was already `require_super_admin`-gated.

## Files Modified

* `web/src/pages/SuperAdmin.tsx`
* `web/src/pages/Mods.tsx`

## Testing

`tsc -b` typechecks clean after the move. Full PyInstaller + Inno Setup rebuild succeeded.

## Result

"Install From File" now only exists on the Super Admin page - regular admins have no trace of it on Mods, matching how every other super-admin-only action in this app is organized.

## Notes

Prompted by the user reviewing access boundaries after TICKET-0013/0014; confirmed via code review that the underlying permission was already correct on both ends, this was purely a UI-organization change.

## Closed

2026-07-06
