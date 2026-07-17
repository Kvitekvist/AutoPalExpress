# TICKET-0164

**Status**

Closed

**Type**

Bug

**Priority**

High

**Created**

2026-07-17

---

## Description

Two live bug reports from real users after the 1.0.8 release:

1. **Silent failures in Server Control actions.** A user reported that clicking "Save World" repeatedly still shows "Last saved: Never" on the dashboard, with no error message at all. Root cause: `web/src/pages/ServerControl.tsx`'s `handleSave`, `handleStart`, `handleStop`, `handleRestart`, `handleCheckUpdate`, and `handleBroadcast` all use `try { ... } finally { ... }` with **no `catch` block** - only `handleUpdateServer` has one. `web/src/api/httpClient.ts` has no global error handler either (it just throws a plain `Error`), so any failure (most likely the Palworld REST API not being enabled/configured yet, per `app/services/palworld_rest.py`'s `PalworldRestNotConfiguredError`) is swallowed completely: no toast, no visible feedback, button just stops spinning. This is a widespread, longstanding gap across most of this file's action handlers, not just Save.

2. **Mods added via wishlist don't appear installed.** A user reported that mods wishlisted for a Steam-imported server never show up in the mods folder. Investigated `local_config.py`, `mod_installer.py`, `steam_locator.py`, and the instance import routes end-to-end - found no path-resolution or disk-write defect for Steam-imported servers. Traced the actual install pipeline instead: since TICKET-0153, the Browse Nexus Mods dialog is wishlist-only for every role (including super admin) - a mod only reaches disk once a super admin approves the request on the Mod Wishlist page, and that approval calls `nexus_mod_service.install_nexus_mod()`, which requires a working Nexus API key via `nexus_session.require_premium_api_key()`. That key can currently only come from the SSO flow in `app/services/nexus_sso.py`, whose `APPLICATION_SLUG = "autopalexpress"` is explicitly marked in-code as a placeholder guess pending Nexus Mods' approval of the application registration - i.e. this is the exact "mod deployment is still pending nexus approval" limitation already called out in the 1.0.8 release notes, not a new defect. `ModWishlistPanel.tsx`'s approve action does have a proper `catch`/`notifications.error`, so a super admin attempting approval today should see an explicit error, not silence - unless they never approved the request at all (wishlist-only workflow confusion, also plausible).

---

## Reason

Direct user feedback after 1.0.8 shipped to production servers.

---

## Implementation Plan

* [x] `ServerControl.tsx`: add `catch (e)` blocks to `handleStart`, `handleStop`, `handleRestart`, `handleSave`, `handleCheckUpdate`, `handleBroadcast`, each calling `notifications.error({...})` with the thrown message, matching the existing `handleUpdateServer` pattern.
* [x] Added matching `serverControl.notifications.{start,stop,restart,save,checkUpdate,broadcast}FailedTitle` translation keys to all 5 non-English locales (de/es/fr/ja/zh-Hans) for parity with the rest of that namespace.
* [x] No code fix for item 2 - it is a known, already-disclosed limitation (Nexus application approval pending, outside this app's control). Respond to the reporting user with an explanation and the "Install From File" manual-upload workaround (`InstallFromFileDialog.tsx`, Super Admin page), which does not depend on the Nexus API/SSO at all.

---

## Files Modified

`web/src/pages/ServerControl.tsx`, `web/src/i18n/locales/{de,es,fr,ja,zh-Hans}.json`

---

## Testing

Backend unaffected (no backend changes). Frontend: `npm run typecheck`/`lint`/`format:check`/`build` all clean.

---

## Result

Item 1 fixed: all six Server Control actions now surface a translated error toast on failure instead of failing silently. Item 2 has no code fix (working as designed, blocked entirely on Nexus approving the application registration) - flagged for the developer to relay the manual-upload workaround to the reporting user.

---

## Notes

Item 2's root cause was already implicitly known to the developer (see the 1.0.8 release notes' "mod deployment is still pending nexus approval" note) but had not yet been traced to the specific `APPLICATION_SLUG` placeholder in `nexus_sso.py` or confirmed against a live user report until this ticket.

---

## Closed

2026-07-17
