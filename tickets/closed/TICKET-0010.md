# TICKET-0010

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

Security audit finding: `POST /api/auth/login` responded near-instantly for a nonexistent username, but took ~200,000 PBKDF2 iterations' worth of time (tens of milliseconds) for a real username with a wrong password. That timing difference alone lets an attacker enumerate valid usernames on the system without ever guessing a password.

## Reason

`auth.verify_login()` looked up the user first and returned immediately if not found, only running the expensive password hash comparison for usernames that actually exist.

## Implementation Plan

* [x] Added a fixed dummy salt/hash pair computed once at import time. `verify_login()` now runs a real PBKDF2 comparison against that dummy hash even when the username doesn't exist, before returning `None`, so both cases cost the same amount of time.

## Files Modified

* `app/services/auth.py`.

## Testing

Measured directly rather than just reasoning about it: ran 8 login attempts each for a nonexistent username and for a real username with a wrong password, against an isolated temp user store. Before describing this as fixed, confirmed the ratio of average response times was ~1.01 (67.7ms vs 66.9ms) - effectively indistinguishable, versus what would have been a near-zero ratio (instant vs ~67ms) before the fix.

## Result

Login response time no longer reveals whether a given username exists.

## Notes

Part of a batch of fixes from a full security audit; see TICKET-0008/0009/0011 for the others.

## Closed

2026-07-06
