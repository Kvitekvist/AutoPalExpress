# TICKET-0091

**Status**

Open

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

* [ ] Establish one authoritative application-version source used by the backend, Nexus `Application-Version` header, sidebar version label, update comparison, and packaging process. Add a build/verification check that fails when `installer.iss` disagrees.
* [ ] Add a backend update-check service for `GET https://api.github.com/repos/Kvitekvist/AutoPalExpress/releases/latest` using GitHub's recommended headers, a short network timeout, and no authentication for the public repository.
* [ ] Compare normalized semantic versions safely (`v1.0.7` and `1.0.7` should be equivalent); do not treat drafts or prereleases as normal updates.
* [ ] Cache successful checks for 6-12 hours so routine frontend polling cannot consume GitHub's unauthenticated rate limit.
* [ ] Expose a small authenticated read-only endpoint returning the installed version, latest version, release URL, release title/date, update availability, and a non-fatal unavailable state.
* [ ] Check after application startup/page load without delaying startup or blocking any server-management feature when GitHub is slow or unavailable.
* [ ] Add a restrained update indicator near the existing sidebar version text. Keep it visually quiet when current; show a small gold dot/badge and “Update available” only when a newer stable release exists.
* [ ] Open the official GitHub Release page for release notes and installer download. Do not implement unattended automatic installation in this ticket.
* [ ] Add translations, README/user guidance, changelog, architecture notes, project memory, and ticket memory.
* [ ] Add version-comparison, caching, GitHub failure/rate-limit, and frontend build checks.

---

## Security and Reliability

* No GitHub personal token or user credential should be stored.
* Only use the fixed official repository endpoint and return its canonical release URL; do not accept a repository or URL from normal users.
* GitHub failures, malformed responses, rate limits, and offline hosts must degrade silently to “update status unavailable” and never affect server control.
* Do not automatically execute downloaded installers or binaries.

---

## Files Modified

* (pending implementation)

---

## Testing

(pending implementation)

---

## Result

(pending)

---

## Closed
