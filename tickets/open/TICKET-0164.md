# TICKET-0164

**Status**

Open (reopened - item 2's root cause was wrong)

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

2. **Mods not appearing installed, for a Steam-imported server.** A user reported that 2 mods ("Admin Commands (Server Side)" and "Better Server-Side Commands 1.5 with UE4SS") don't show up in the mods folder after adding them. Developer confirmed the reporting user is using the **Install From File** dialog (`InstallFromFileDialog.tsx` / `manual_mod_service.py`), not the Nexus wishlist/approve pipeline - this ruled out the initial hypothesis below (struck through, kept for the record since it's a real, separate limitation, just not the cause of this report):
   - ~~Traced the actual install pipeline: since TICKET-0153 the Browse Nexus Mods dialog is wishlist-only, and approval requires `nexus_session.require_premium_api_key()`, which needs a working SSO key that can't currently be obtained (`nexus_sso.py`'s `APPLICATION_SLUG` is a placeholder pending Nexus's approval of the app registration).~~ **Confirmed not applicable**: Install From File's verify step (`nexus_client.file_hash_search()`) is a keyless GraphQL lookup with no dependency on any saved API key or SSO status - it works (or fails) the same regardless of the pending Nexus application approval.
   - Re-investigated the actual Install From File path end to end (`manual_mod_service.prepare_upload`/`confirm_upload`, `mod_installer.extract_and_install`, `mods_shared.base_path_for_kind`, `local_config.default_mods_path`) and found no code-level defect: extraction/placement logic is structurally sound (zip-slip/zip-bomb guarded, UE4SS-prefix-stripping handles common archive layouts), and both `prepare_upload` and `confirm_upload` raise real `HTTPException`s on failure that the dialog surfaces via `setError` (unlike the ServerControl.tsx bug in item 1, this dialog was not found to swallow errors silently).
   - Leading hypothesis, unconfirmed: `default_mods_path()` writes UE4SS mods to the newer nested `Pal\Binaries\Win64\ue4ss\Mods` path (TICKET-0142/0143's fix for conflicts with the legacy flat layout), but most third-party Palworld modding guides - and older versions of this app - still reference the flat `Pal\Binaries\Win64\Mods` path. The user may be checking the old location. Needs the reporting user to confirm which exact folder they checked, and whether the Install From File dialog showed a green "Verified against Nexus Mods" confirmation before installing, or a rejection error.

---

## Reason

Direct user feedback after 1.0.8 shipped to production servers.

---

## Implementation Plan

* [x] `ServerControl.tsx`: add `catch (e)` blocks to `handleStart`, `handleStop`, `handleRestart`, `handleSave`, `handleCheckUpdate`, `handleBroadcast`, each calling `notifications.error({...})` with the thrown message, matching the existing `handleUpdateServer` pattern.
* [x] Added matching `serverControl.notifications.{start,stop,restart,save,checkUpdate,broadcast}FailedTitle` translation keys to all 5 non-English locales (de/es/fr/ja/zh-Hans) for parity with the rest of that namespace.
* [ ] Item 2 reopened: no code defect found yet in the Install From File path itself. Waiting on the reporting user to confirm (a) the exact folder they checked, and (b) whether the dialog showed a verified-success state or an error before deciding whether this needs a code fix (e.g. a clearer post-install "installed to: &lt;path&gt;" confirmation) or is a documentation/folder-location mismatch.

---

## Files Modified

`web/src/pages/ServerControl.tsx`, `web/src/i18n/locales/{de,es,fr,ja,zh-Hans}.json`

---

## Testing

Backend unaffected (no backend changes). Frontend: `npm run typecheck`/`lint`/`format:check`/`build` all clean.

---

## Result

Item 1 fixed: all six Server Control actions now surface a translated error toast on failure instead of failing silently. Item 2 is still open - my first-pass conclusion (blocked on Nexus's pending SSO approval) was wrong once the developer confirmed the reporting user is on the Install From File path, which doesn't touch the SSO/API-key gate at all. Re-investigated that path's code and found no defect; needs more information from the reporting user before a code fix (if any is needed) can be identified.

---

## Notes

2026-07-17: Initially closed this ticket having incorrectly attributed item 2 to the known pending-Nexus-approval limitation, without first confirming which install path (wishlist vs. Install From File) the reporting user actually used. Reopened after the developer corrected this. Lesson: don't conclude a "known limitation" explains a report without confirming the user actually went through the code path that limitation affects.
