# TICKET-0091

**Status**

Closed

**Type**

Feature

**Priority**

Medium

**Created**

2026-07-12

---

## Description

Notify users when a newer AutoPalExpress version has been published as a GitHub Release in `Kvitekvist/AutoPalExpress`.

The application should read the repository's public latest-release metadata without requiring a GitHub account, access token, or repository integration credential. When the published stable release is newer than the installed application, show a quiet update indicator that opens the corresponding GitHub Release page.

---

## Reason

Users currently have no in-app way to learn that a newer installer is available. They must revisit GitHub or Nexus manually, which makes important fixes easy to miss.

---

## Implementation Plan

* [x] Added `app/version.py` as the runtime version source used by Nexus, the update service, and sidebar; packaging now runs a script that rejects disagreement with `installer.iss`.
* [x] Added the fixed public GitHub latest-release check with current recommended headers, a five-second timeout, and no authentication.
* [x] Added strict stable semantic-version normalization for `vX.Y.Z`/`X.Y.Z`; drafts, prereleases, and malformed metadata are unavailable rather than updates.
* [x] Cache successful checks for six hours and failures for fifteen minutes.
* [x] Added authenticated `GET /api/app-update` with current/latest versions, release URL/title/date, update flag, and availability state.
* [x] Check from the sidebar after page load without blocking backend or frontend startup.
* [x] Added a restrained gold-dot sidebar update indicator only when a newer stable release exists.
* [x] Link to the canonical official GitHub Release page; no automatic installer behavior.
* [x] Added translation-ready copy, README guidance, changelog, architecture notes, project memory, and ticket memory.
* [x] Added version agreement, comparison, cache, endpoint, lint, and production-build checks.

---

## Security and Reliability

* No GitHub personal token or user credential should be stored.
* Only use the fixed official repository endpoint and return its canonical release URL; do not accept a repository or URL from normal users.
* GitHub failures, malformed responses, rate limits, and offline hosts must degrade silently to “update status unavailable” and never affect server control.
* Do not automatically execute downloaded installers or binaries.

---

## Files Modified

* `app/version.py`
* `app/services/app_update.py`
* `app/routes/app_update.py`
* `app/services/nexus_client.py`
* `app/main.py`
* `scripts/check_app_version.py`
* `build_installer.ps1`
* `web/src/api/appUpdateApi.ts`
* `web/src/api/index.ts`
* `web/src/types/models.ts`
* `web/src/components/layout/Sidebar.tsx`
* Project documentation and memory files

---

## Testing

* Python compilation passed for all new/changed backend modules.
* Version-source verification passed at 1.0.6.
* Mocked GitHub response verified semantic comparison, canonical URL generation, and one-call caching.
* FastAPI test request verified the authenticated status endpoint returns its expected payload.
* Frontend lint passed with five unrelated pre-existing warnings.
* Frontend production build passed.
* Live automatic installer/download behavior was not tested because none is implemented.

---

## Result

Users now receive a quiet sidebar notice when a newer stable GitHub Release exists. Offline/rate-limited checks disappear harmlessly and all server controls continue normally.

---

## Closed

2026-07-12
