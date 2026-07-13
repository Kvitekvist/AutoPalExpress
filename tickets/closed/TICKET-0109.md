# TICKET-0109

**Status**

Closed

**Type**

Feature

**Priority**

Medium

**Created**

2026-07-13

---

## Description

Two user requests from the same conversation:

1. Mods page: mods that are only wishlisted (not installed yet, and not an update to something already installed) had no visibility on the main Mods page at all - only inside the Nexus Browse dialog or the super admin's Mod Wishlist page. Added a "Pending Install" badge/card for these directly on the Mods page.
2. Reverted TICKET-0107's decision to disable "Connect" until Nexus confirms the real application slug. The user explicitly wants the button visible and clickable now, relabeled "Nexus Login" - even knowing it may not fully work yet, they want to see what the real Nexus authorization step looks like rather than have it hidden pending confirmation.

---

## Reason

(1) is straightforward visibility the user asked for directly. (2) is a direct reversal of a judgment call from TICKET-0107 - the user prefers seeing/trying the real flow over a proactively-disabled button, which is worth remembering for future similar situations (see `[[feedback_show_dont_hide_unconfirmed_integrations]]`).

---

## Implementation Plan

* [x] `web/src/components/mods/PendingModCard.tsx` (new): lightweight, non-reorderable card for a wishlist request with no matching installed mod - name, author, summary, "Pending Install" badge, requester, View on Nexus link.
* [x] `web/src/pages/Mods.tsx`: computes `pendingNewRequests` (wishlist entries whose `nexusModId` doesn't match any installed mod's `sourceModId` - update requests for an already-installed mod keep their existing "Update Requested" badge on `ModCard` instead) and renders one `PendingModCard` per entry above the reorderable installed-mods list.
* [x] `app/services/nexus_sso.py`: removed `SLUG_CONFIRMED`/`is_configured()` added in TICKET-0107.
* [x] `app/routes/nexus.py`: removed `GET /sso/configured` and the `POST /sso/start` 409 guard.
* [x] `web/src/api/nexusApi.ts`: removed `getSsoConfigured()`.
* [x] `web/src/components/settings/NexusIntegrationPanel.tsx`: Connect button is unconditionally enabled again, relabeled "Nexus Login" (was "Connect via Nexus Mods"), added a `catch` around `handleConnect` so a failed `startSso()` call itself surfaces as a popup error instead of an unhandled rejection.
* [x] Rebuilt the packaged executable and installer.

---

## Files Modified

* `web/src/components/mods/PendingModCard.tsx` (new)
* `web/src/pages/Mods.tsx`
* `app/services/nexus_sso.py`
* `app/routes/nexus.py`
* `web/src/api/nexusApi.ts`
* `web/src/components/settings/NexusIntegrationPanel.tsx`

---

## Testing

* `python -m py_compile` on both changed backend files - passes.
* `npx tsc --noEmit` on the frontend - passes with no errors.
* Grepped the repo to confirm no stray references to the removed `SLUG_CONFIRMED`/`is_configured`/`getSsoConfigured`/`sso_configured` remain.
* Rebuilt via `scripts\build.bat` - all three build steps completed successfully. New installer checksum: `2F0BAA4E124B14D5C4D26BB769859CFD5A770A1B618889385260C08BEF1EC0FD`.
* Not tested: the actual pending-badge rendering or the real Nexus Login click-through in a browser (no interactive desktop in this environment) - clicking Nexus Login will now genuinely attempt the SSO handshake with the placeholder application slug, and Nexus's own authorization page is what decides what happens next.

---

## Result

Fixed and rebuilt (checksum above; README and `installer_output/CHECKSUMS.txt` updated to match). The Mods page now surfaces wishlisted-but-not-installed mods with a "Pending Install" badge, and "Nexus Login" is visible/clickable again per the user's explicit preference to see the real Nexus authorization step rather than have it hidden pending confirmation.

---

## Notes

`APPLICATION_SLUG` in `nexus_sso.py` is still a placeholder - clicking Nexus Login now actually reaches Nexus's real SSO page with it, so whatever Nexus shows for an unrecognized application slug is exactly what the user will see until the real slug is confirmed and swapped in.

---

## Closed

2026-07-13