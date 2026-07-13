# TICKET-0107

**Status**

Closed

**Type**

Bug

**Priority**

Medium

**Created**

2026-07-13

---

## Description

Follow-up to TICKET-0105/TICKET-0106: until Nexus Mods confirms AutoPalExpress's real application slug, clicking "Connect via Nexus Mods" would open a Nexus SSO page for an unregistered application slug (`"autopalexpress"`, still a placeholder) - a broken experience with no clear explanation. Asked the user directly (AskUserQuestion) whether to wire in a real slug now or degrade gracefully in the meantime; they chose graceful degradation since no real slug exists yet.

---

## Reason

Presenting a Connect button that's guaranteed to fail (because the target application slug was never actually registered) is worse than clearly stating the real state - the user should never have to discover this by clicking through to a broken Nexus page.

---

## Implementation Plan

* [x] `app/services/nexus_sso.py`: added `SLUG_CONFIRMED` (currently `False`) alongside the existing placeholder `APPLICATION_SLUG`, and an `is_configured()` helper - kept as two separate values instead of checking the slug string itself, since Nexus's real assigned slug could coincidentally equal the placeholder text.
* [x] `app/routes/nexus.py`: added `GET /sso/configured`; `POST /sso/start` now returns 409 with a clear message instead of starting a session that can only ever fail.
* [x] `web/src/api/nexusApi.ts`: added `getSsoConfigured()`.
* [x] `web/src/components/settings/NexusIntegrationPanel.tsx`: fetches the configured flag alongside the account; while not configured, the Connect button is disabled, relabeled "Pending Nexus Mods Approval" with an hourglass icon, and the hint text explains why instead of describing a flow that would fail.
* [x] Rebuilt the packaged executable and installer with this fix.

---

## Files Modified

* `app/services/nexus_sso.py`
* `app/routes/nexus.py`
* `web/src/api/nexusApi.ts`
* `web/src/components/settings/NexusIntegrationPanel.tsx`

---

## Testing

* `python -m py_compile` on both changed backend files - passes.
* `npx tsc --noEmit` on the frontend - passes with no errors.
* Confirmed directly that `nexus_sso.is_configured()` returns `False` with the current placeholder/unconfirmed state.
* Rebuilt via `scripts\build.bat` - all three build steps completed successfully. New installer checksum: `BF8A8D31377999031F46EC81A6A1FDEFDBF48880681A812AB135CC63351049D7`.
* Not tested: the actual disabled-button rendering in a real browser (no interactive desktop in this environment) - once Nexus confirms the real slug, flipping `SLUG_CONFIRMED` to `True` (and updating `APPLICATION_SLUG`) is what re-enables Connect, and that flip should get a real click-through test at that point.

---

## Result

Fixed and rebuilt (checksum above; README and `installer_output/CHECKSUMS.txt` updated to match). Until Nexus confirms the real application slug, Connect via Nexus Mods now honestly shows "Pending Nexus Mods Approval" and stays disabled, instead of sending the super admin to a Nexus page that would only ever fail.

---

## Notes

To finish this once Nexus responds: set `nexus_sso.APPLICATION_SLUG` to the real value and `SLUG_CONFIRMED = True` in the same change, then do one real end-to-end Connect click-through in a browser.

---

## Closed

2026-07-13