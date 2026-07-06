# TICKET-0014

**Status**

Closed

**Type**

Bug

**Priority**

Medium

**Created**

2026-07-06

---

## Description

Fresh security audit finding: `automation.router` (`/api/automation/*` - schedule config, backups list, run-backup-now) was still registered with the regular-admin-level `_authed` dependency in `main.py`, even after TICKET-0012 locked its only UI entry point (`AutomationPanel`, on the Settings page) behind super admin. A regular admin (or a stolen regular-admin session) could still reach these endpoints directly via the API, bypassing the UI restriction entirely.

## Reason

TICKET-0009 explicitly restricted instance provisioning and mods-path override to super admin at the backend, matching the frontend; TICKET-0012 then locked the whole Settings tab in the frontend but didn't re-audit `automation.router`'s own registration, leaving this one inconsistent. Given the user's explicit intent locking the Settings tab behind super admin, the backend should match.

## Implementation Plan

* [x] Changed `automation.router`'s registration in `main.py` from `dependencies=_authed` to `dependencies=_super_admin_only` (same mechanism already used for `network.router`).

## Files Modified

* `app/main.py`.

## Testing

Verified end-to-end via a real HTTP request through the actual FastAPI app: registered a super admin and an invited regular admin, confirmed the regular admin gets 403 on `GET /api/automation` while the super admin passes the auth layer (reaches the expected "no active instance" business-logic error instead, confirming it's not blocked by auth).

## Result

Automation configuration and backups are now super-admin-only at both the frontend and backend, closing the gap TICKET-0012 left open.

## Notes

Found during the same fresh audit pass as TICKET-0013.

## Closed

2026-07-06
