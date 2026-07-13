# TICKET-0105

**Status**

Closed

**Type**

Feature

**Priority**

High

**Created**

2026-07-13

---

## Description

Nexus Mods support reviewed AutoPalExpress for their app-registration process and asked for one remaining change: fully remove *personal* Nexus API key usage. Their reply: "That looks like most everything! The last bit now we need is for you to fully remove the personal API key usage. With that done we can run this through the registration process :)"

Researched Nexus's actual registered-app mechanism (`https://api-docs.nexusmods.com`, `Nexus-Mods/node-nexus-api`, `Nexus-Mods/sso-integration-demo` - the same approach Vortex/MO2 use): a registered app gets an "application slug" (appid) and uses Nexus's SSO protocol instead of asking users to paste their personal key into a text field:

1. Generate a request id (uuid4), open `wss://sso.nexusmods.com`, send `{"id": <uuid>, "token": null, "protocol": 2}`.
2. Send the user to `https://www.nexusmods.com/sso?id=<uuid>&application=<slug>` to log in and approve the app.
3. The socket receives `{"success": true, "data": {"api_key": "..."}}` once approved.

The resulting key is still functionally a per-user Nexus API key (that part doesn't change - it's what every download-capable Nexus API call, registered or not, ultimately authenticates with) - what changes is *how it's obtained*: through Nexus's own consent redirect instead of the super admin copying their personal key out of their Nexus account settings and pasting it into AutoPalExpress. That distinction is exactly what Nexus's registration process gates on.

Confirmed with the user (AskUserQuestion) two follow-on product decisions raised by this change:
* Mod Wishlist's approve-and-auto-install behavior is unaffected (still uses the SSO-obtained key) - no change needed there.
* Per-mod "Update" stops being a one-click super-admin action. Instead: `updateAvailable`/`latestVersion` become real (previously always `false`/unset - dead fields), computed via Nexus's public keyless GraphQL `mods` query (`gameId`/`modId` OR-batched, confirmed live via curl - no API key needed at all for this check). Any admin can "Request Update" - reusing the existing wishlist add/approve pipeline verbatim, since `_install_nexus_mod` already replaces an existing `sourceModId` match in place. The old one-click `POST /mods/{id}/update` path is removed.

The user does not have a Nexus-assigned application slug yet (registration is in progress) - wired as a clearly-marked placeholder constant per the user's explicit choice, to be swapped in once Nexus confirms it.

---

## Reason

Direct requirement from Nexus Mods support to complete the app's registration/approval process - without this, AutoPalExpress cannot be listed as a registered application.

---

## Implementation Plan

* [x] `requirements.txt`: add `websockets` as an explicit dependency (was already present transitively via `uvicorn[standard]`).
* [x] `app/services/nexus_sso.py` (new): in-memory SSO session state machine - `start()` generates a request id and spawns a background task that connects to `wss://sso.nexusmods.com`, sends the protocol-2 handshake, and waits for the `api_key` message (or an error/timeout); `get_status()` for polling.
* [x] `app/routes/nexus.py`: remove `POST /connect` (personal key paste); add `POST /sso/start` and `GET /sso/status/{request_id}` (the status route does the validate+save once authorized, mirroring what `/connect` used to do with a pasted key).
* [x] `app/services/nexus_client.py`: add `get_current_versions()` - a single batched, keyless GraphQL query (OR-combined `gameId`+`modId` sub-filters, confirmed live against the real API) that returns each requested mod's current published version.
* [x] `app/routes/mods.py`: `get_mods()` now enriches every installed mod that has a `sourceModId` with real `updateAvailable`/`latestVersion` from `get_current_versions()`, computed per-request rather than persisted. Removed `POST /{mod_id}/update` (superseded by the wishlist request/approve path, which already handles "replace an existing installed mod" with no changes needed).
* [x] `web/src/api/nexusApi.ts`: replace `connectApiKey` with `startSso`/`getSsoStatus`.
* [x] `web/src/api/modsApi.ts`: remove `updateMod`; add `requestModUpdate()` posting to the existing wishlist endpoint with a `Mod`'s own fields.
* [x] `web/src/types/models.ts`: add `NexusSsoStatus`.
* [x] `web/src/components/settings/NexusIntegrationPanel.tsx`: replace the paste-a-key form with a "Connect via Nexus Mods" button that opens the SSO authorize URL and polls status until connected/error/timeout.
* [x] `web/src/components/mods/ModCard.tsx` / `web/src/pages/Mods.tsx`: "Update to vX" now requests an update via the wishlist instead of installing directly; shows "Requested" once pending, matching `NexusModCard`'s existing pattern.
* [x] `web/src/components/settings/ModWishlistPanel.tsx`: label a request as "Update" vs a fresh install when its `nexusModId` matches an already-installed mod, so the super admin knows which they're approving.
* [x] `README.md` / `CHANGELOG.md`: document the SSO connect flow and the new real update-checking/request flow.

---

## Files Modified

* `requirements.txt`
* `app/services/nexus_sso.py` (new)
* `app/services/nexus_client.py`
* `app/routes/nexus.py`
* `app/routes/mods.py`
* `web/src/api/nexusApi.ts`
* `web/src/api/modsApi.ts`
* `web/src/types/models.ts`
* `web/src/components/settings/NexusIntegrationPanel.tsx`
* `web/src/components/mods/ModCard.tsx`
* `web/src/pages/Mods.tsx`
* `web/src/components/settings/ModWishlistPanel.tsx`
* `README.md`
* `CHANGELOG.md`

---

## Testing

* `python -m py_compile` on all changed/new backend files - passes.
* `npx tsc --noEmit` on the frontend - passes with no errors.
* Verified the new keyless GraphQL update-check query directly against the real Nexus API with `curl` before writing `get_current_versions()` (confirmed `gameId`/`modId` OR-sub-filter batching works and returns real `version` strings for real Palworld mod ids - Palworld's numeric `gameId` is 6063, also confirmed live).
* Ran `_with_update_status()` for real against the live Nexus GraphQL API with a synthetic mod list (one mod with a real, known-outdated stored version, one already current, one with no Nexus source) - confirmed `updateAvailable`/`latestVersion` come out correct in all three cases (see conversation for the exact fixture; not left as a repo test file, this project has no automated suite).
* Verified the SSO client-side protocol logic (`nexus_sso._run`) against a fake in-process websocket (no real network) covering three real scenarios: the connection-token ack followed by a real `api_key` message (ends `authorized`), an explicit `{"success": false, "error": ...}` message (ends `error` with that message preserved), and a socket that closes having only ever sent the connection-token ack (ends `pending`, does not crash). Also asserted the exact handshake payload sent (`{"id", "token": null, "protocol": 2}`) matches the documented protocol.
* Not tested: an actual end-to-end SSO handshake against Nexus's real `wss://sso.nexusmods.com` - this requires a Nexus-approved application slug, which does not exist yet (placeholder wired per the user's choice), and a real browser to complete the login/approve redirect. Also not tested: the actual browser UI (NexusIntegrationPanel's polling/window.open, ModCard's Request Update button, ModWishlistPanel's Update badge) - no interactive browser in this environment.

---

## Result

Nexus's personal-API-key requirement is gone from the connection UX: `NexusIntegrationPanel` now has a single "Connect via Nexus Mods" button that opens Nexus's SSO approval page and polls until a key arrives over the (server-side) websocket - the super admin never sees or pastes a key. Everything downstream that already used a saved key (Direct Install, Wishlist approve) needed no changes at all, since the key itself still works the same way; only how it's obtained changed.

Installed mods now show genuine update availability via a keyless Nexus GraphQL batch query instead of the old always-`false` placeholder fields. Updating a mod is no longer a one-click super-admin action - any admin can "Request Update," which reuses the exact same wishlist add/approve pipeline as requesting a brand-new mod (no backend change needed there, since `_install_nexus_mod` already replaces an existing `sourceModId` match in place). Mod Wishlist now shows an "Update" badge to tell the super admin which requests are updates to something already installed versus brand-new installs.

Remaining before this can go live: Nexus needs to confirm the real application slug (currently a placeholder), and a human needs to click through the actual SSO browser flow once that's in place.

---

## Notes

`APPLICATION_SLUG` in `nexus_sso.py` is a placeholder (`"autopalexpress"`) - update it to the real value the moment Nexus confirms the registered slug, and do a real end-to-end SSO connect test at that point (this environment cannot drive a real browser login/approve step).

---

## Closed

2026-07-13