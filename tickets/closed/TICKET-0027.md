# TICKET-0027

**Status**

Closed

**Type**

Enhancement

**Priority**

High

**Created**

2026-07-07

---

## Description

Update Nexus Mods integration for public-release compliance after Nexus support pointed to the API Acceptable Use Policy and suggested GraphQL for metadata-only use.

---

## Reason

Public-facing releases should not rely on a personal Nexus API key for shared browsing/download behavior. Nexus requests also need identifying headers, and automated downloads should wait for the registered app/OAuth path.

---

## Implementation Plan

* [x] Add Nexus request identification headers.

* [x] Move mod browsing to unauthenticated Nexus GraphQL metadata.

* [x] Move manual uploaded-file hash verification to unauthenticated Nexus GraphQL `fileHash`.

* [x] Pause one-click Nexus downloads with a clear user-facing message.

* [x] Remove the installer/API-key setup expectation and update public docs.

---

## Files Modified

Backend Nexus client/routes, frontend Nexus browse/settings UI, installer script, README/Nexus description, memory docs, changelog.

---

## Testing

Verified the Nexus GraphQL endpoint with a live Palworld metadata query and an empty MD5 hash lookup. Ran frontend and backend build checks, then rebuilt the installer.

---

## Result

Nexus browsing no longer requires a personal API key, verified manual installs still check the exact uploaded file against Nexus, and automated Nexus downloads are paused pending Nexus registered app/OAuth approval.

---

## Notes

Legacy API-key validation remains for backward compatibility/testing, but the public release flow does not depend on it.

---

## Closed

2026-07-07
