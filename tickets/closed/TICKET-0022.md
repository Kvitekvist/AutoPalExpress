# TICKET-0022

**Status**

Closed

**Type**

Enhancement

**Priority**

Medium

**Created**

2026-07-07

---

## Description

Refresh public release documentation before sharing AutoPalExpress with the community.

---

## Reason

The Nexus description and README still described older mocked behavior and older page locations, which could make the app look less complete or confuse first-time users.

---

## Implementation Plan

* [x] Update README's real-vs-limited section for the current Logs page.

* [x] Update Nexus-facing description for current features and Super Admin locations.

* [x] Add clearer security/remote-access and unsigned-installer notes for public release.

---

## Files Modified

* `README.md`
* `NEXUS_DESCRIPTION.md`

---

## Testing

* [x] Documentation reviewed for consistency with current app behavior.

---

## Result

Public-facing docs now describe the current feature set and set clearer expectations around remote access, HTTP, trusted invites, and unsigned installer warnings.

---

## Notes

Checksum should be generated after the final installer build, because any rebuild changes it.

---

## Closed

2026-07-07
