# TICKET-0008

**Status**

Closed

**Type**

Bug

**Priority**

High

**Created**

2026-07-06

---

## Description

Security audit finding: `GET /api/server-settings` returned the real, plaintext RCON `AdminPassword` and `ServerPassword` to *any* authenticated user, not just the super admin - the World Settings page's `sensitive: true` flag only tells the frontend to render a password-style input, it doesn't redact the value in the actual API response. Any invited friend-admin could read the real RCON password via browser DevTools' Network tab.

## Reason

`AdminPassword` is the credential for direct RCON access to the game server - equivalent to what regular admins already get through the app's own kick/ban/broadcast buttons, but usable to bypass the app and its access control entirely (e.g. after an admin's account is later removed). This is a real credential, not an operational setting like difficulty or EXP rate, and shouldn't be visible to (or changeable by) anyone but the super admin.

## Implementation Plan

* [x] `server_settings.get_settings()` now redacts `AdminPassword`/`ServerPassword` (replaced with a placeholder) in the response unless the requester is `super_admin`.
* [x] `server_settings.update_settings()` now rejects (403) any attempt by a non-super-admin to set either field.

## Files Modified

* `app/routes/server_settings.py`.

## Testing

Verified end-to-end via a real HTTP request through the actual FastAPI app (`TestClient`), not just unit-level: registered a super admin and an invited regular admin against a real (fixture) `PalWorldSettings.ini` containing a known `AdminPassword`. Confirmed the super admin's `GET` sees the real value, the regular admin's `GET` sees the redacted placeholder, and the regular admin's `POST` attempting to set `AdminPassword` is rejected with 403.

## Result

The RCON/server password can now only be viewed or changed by the super admin.

## Notes

Part of a batch of fixes from a full security audit; see TICKET-0009/0010/0011 for the others.

## Closed

2026-07-06
