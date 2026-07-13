# TICKET-0108

**Status**

Closed

**Type**

Bug

**Priority**

High

**Created**

2026-07-13

---

## Description

User report: hitting an expected error on the Super Admin page (testing the new Nexus SSO changes) also force-logged them out of AutoPalExpress entirely, instead of just showing a popup error like every other action failure in the app.

Root cause traced to `web/src/api/httpClient.ts`: any HTTP 401 response from a non-`/api/auth/*` path fires `UNAUTHORIZED_EVENT`, which `AuthProvider` treats as "your AutoPalExpress session died" and force-returns to the login screen. Two backend sources of Nexus-related 401s collided with that:

1. `nexus_session.require_api_key()` raised a literal `HTTPException(status_code=401, ...)` whenever no Nexus connection exists - which, after TICKET-0106 (the legacy personal-key invalidation fix shipped this same session), is now the normal state for every super admin until the real application slug lands.
2. Four route handlers forwarded `NexusApiError.status_code` straight through as the HTTP status - so if Nexus's own API ever returns a 401 (invalid/expired key), that became AutoPalExpress's own 401 too.

Neither of those actually means "your login session is invalid" - they mean "Nexus isn't connected" or "the Nexus key is stale," both normal, recoverable app states that should surface as an ordinary error toast, not a forced logout.

---

## Reason

Direct user report - an unrelated, expected app-level error (no Nexus connection) was logging them out of AutoPalExpress entirely, a much more disruptive failure mode than intended and unrelated to their actual session validity.

---

## Implementation Plan

* [x] `app/services/nexus_session.py`: `require_api_key()` now raises `400`, not `401`, for "no Nexus connection yet."
* [x] `app/services/nexus_client.py`: added `NexusApiError.http_status` - maps Nexus's own `401` to `400` (everything else passes through unchanged, e.g. `403`/`429` are left alone since the frontend doesn't treat those specially).
* [x] `app/routes/nexus.py` / `app/routes/mods.py`: the four call sites that forwarded `NexusApiError.status_code` directly now use `.http_status` instead.
* [x] Verified directly: `NexusApiError(401, ...).http_status == 400` while `403`/`429`/`502` pass through unchanged; `require_api_key()` now raises a `400`, not `401`.
* [x] Rebuilt the packaged executable and installer with this fix.

---

## Files Modified

* `app/services/nexus_session.py`
* `app/services/nexus_client.py`
* `app/routes/nexus.py`
* `app/routes/mods.py`

---

## Testing

* `python -m py_compile` on all four changed files - passes.
* Verified directly (see Implementation Plan) that the remapping is correct in both directions and that other status codes are left untouched.
* Rebuilt via `scripts\build.bat` - all three build steps completed successfully. New installer checksum: `B693CBFBC3C87FE94F9B0604878BD53BCCD898D997D8E17661B8B200A0AD143A`.
* Not tested: an actual browser click-through reproducing the original report (no interactive desktop in this environment) - the fix targets the exact mechanism described (a non-auth 401 triggering `UNAUTHORIZED_EVENT`), verified at the unit level instead.

---

## Result

Fixed and rebuilt (checksum above; README and `installer_output/CHECKSUMS.txt` updated to match). Any Nexus-connection-related error (no connection, expired/invalid key) now surfaces as a normal popup error toast via the app's existing notification handling, instead of force-logging the user out of AutoPalExpress.

---

## Notes

Broader takeaway worth remembering: HTTP 401 has one meaning in this app's frontend contract (`httpClient.ts`'s blanket 401-outside-`/api/auth/*` rule) - "your AutoPalExpress session is dead, log in again." Any future backend code must not reuse 401 for a different, recoverable condition (a missing third-party connection, a stale external key, etc.), since it will silently trigger the same forced-logout behavior.

---

## Closed

2026-07-13