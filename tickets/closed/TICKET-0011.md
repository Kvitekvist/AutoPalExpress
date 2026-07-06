# TICKET-0011

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

Security audit finding: session tokens had no server-side expiration at all. The login cookie itself expires client-side after 30 days, but the backend's in-memory session record for that token stayed valid forever, until an explicit logout or a full backend restart. A leaked or captured raw token (more plausible while the panel is still plain HTTP - see the existing plain-HTTP decision in the Decision Log) would keep working indefinitely, regardless of what the cookie's own expiry said, since only the browser was ever enforcing it.

## Reason

`session_store.get_user_id()` did a pure dict lookup with no time check - `createdAt` was recorded but never read back.

## Implementation Plan

* [x] Added a `_MAX_AGE_SECONDS` constant matching the cookie's own 30-day `max_age` (`app/routes/auth.py`). `get_user_id()` now checks a session's age on every lookup and treats (and prunes) anything older as invalid.

## Files Modified

* `app/services/session_store.py`.

## Testing

Verified directly: created a session, confirmed it resolves normally; then backdated its `createdAt` past the max age and confirmed `get_user_id()` returns `None` and the entry is pruned from the in-memory store.

## Result

A session token now stops working server-side after 30 days even if somehow replayed outside the browser that would have honored the cookie's own expiry.

## Notes

Part of a batch of fixes from a full security audit; see TICKET-0008/0009/0010 for the others. Two lower-priority findings from the same audit remain open/deferred (not part of this batch): a latent, not-currently-exploitable batch-injection risk in `firewall.py`'s rule-name handling, and the login rate-limiter's `request.client.host` becoming a shared bucket for all users once the in-progress Nginx Proxy Manager / reverse-proxy setup is live (needs trusted-proxy header handling before that goes live).

## Closed

2026-07-06
