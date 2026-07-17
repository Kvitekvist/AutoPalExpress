# TICKET-0164

**Status**

Closed

**Type**

Bug + Enhancement

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
   - Leading hypothesis, unconfirmed: `default_mods_path()` writes UE4SS mods to the newer nested `Pal\Binaries\Win64\ue4ss\Mods` path (TICKET-0142/0143's fix for conflicts with the legacy flat layout), but most third-party Palworld modding guides - and older versions of this app - still reference the flat `Pal\Binaries\Win64\Mods` path. The user may be checking the old location.
   - Regardless of which exact failure the reporting user hit, the developer decided the underlying design was too restrictive: Install From File's hash-match-against-Nexus requirement (originally added as a safety gate) could itself be the reason a legitimate file was rejected outright - e.g. if the file didn't come from Nexus directly (a different distribution source, a re-zip, an older/newer file revision than what's currently indexed), or if Nexus's keyless GraphQL lookup itself failed/timed out. Decision: **a super admin should be able to install any archive they choose to upload**, the same trust boundary this app already extends to a mod dropped into the mods folder by hand (TICKET-0146). Nexus verification is now used only to auto-fill real name/author/version metadata when it succeeds, not as a gate on whether the install is allowed to proceed at all.

---

## Reason

Direct user feedback after 1.0.8 shipped to production servers.

---

## Implementation Plan

* [x] `ServerControl.tsx`: add `catch (e)` blocks to `handleStart`, `handleStop`, `handleRestart`, `handleSave`, `handleCheckUpdate`, `handleBroadcast`, each calling `notifications.error({...})` with the thrown message, matching the existing `handleUpdateServer` pattern.
* [x] Added matching `serverControl.notifications.{start,stop,restart,save,checkUpdate,broadcast}FailedTitle` translation keys to all 5 non-English locales (de/es/fr/ja/zh-Hans) for parity with the rest of that namespace.
* [x] `manual_mod_service.prepare_upload()`: a Nexus hash miss (or a Nexus API failure) no longer rejects the file - falls through to an unverified pending upload instead, using `mod_installer.peek_archive_name()` to guess a name from the archive's own contents.
* [x] `manual_mod_service.confirm_upload()`: accepts an optional `mod_name` override (used for unverified installs so the super admin can name the mod themselves); marks the resulting mod entry `manuallyInstalled: True` when it wasn't Nexus-verified, reusing the existing "Manually Added" badge (`ModCard.tsx`) with no new UI needed there.
* [x] `app/routes/mods/manual.py`: `ConfirmFileInstallRequest` gained an optional `modName` field; docstring updated to reflect verification is no longer a gate.
* [x] `web/src/types/models.ts`: `VerifiedFileInstall.verified` changed from a literal `true` to `boolean`.
* [x] `web/src/api/modsApi.ts`: `confirmInstallFromFile()` takes an optional `modName`.
* [x] `InstallFromFileDialog.tsx`: branches on `verified.verified` - the existing green "Verified against Nexus Mods" panel for a real match, or a new amber "Not verified" panel with an explanatory note and an editable mod-name text input for an unmatched file. Both paths install through the same confirm button.
* [x] Locale updates (description/fileHint copy changed, new `unverified`/`unverifiedHint`/`modNameLabel` keys) across all 5 non-English translation files.

---

## Files Modified

`web/src/pages/ServerControl.tsx`, `app/services/manual_mod_service.py`, `app/routes/mods/manual.py`, `web/src/types/models.ts`, `web/src/api/modsApi.ts`, `web/src/components/mods/InstallFromFileDialog.tsx`, `web/src/i18n/locales/{de,es,fr,ja,zh-Hans}.json`

---

## Testing

Backend: full `pytest -v` (128 passed) + `ruff check`/`format --check` clean on the modified files. Frontend: `npm run typecheck`/`lint`/`format:check`/`build` all clean. Manual click-through of the unverified-install path (uploading a real non-Nexus-matching archive) not possible in this sandbox - no interactive browser session, same limitation as the rest of this project's UI history - flagged for the developer/reporting user to confirm live.

---

## Result

Item 1 fixed: all six Server Control actions now surface a translated error toast on failure instead of failing silently. Item 2: root cause never fully confirmed (my first pending-Nexus-approval theory was wrong, and the follow-up investigation found no defect in the existing Install From File code), but the developer chose to resolve it at the design level instead of continuing to chase the exact failure - Install From File no longer rejects a file just because it doesn't hash-match Nexus's catalog. A super admin can now install any archive they upload; a match still auto-fills real metadata, a miss installs it unverified (clearly labeled, admin names it themselves) with the same "Manually Added" treatment TICKET-0146 already gives hand-placed mods.

---

## Notes

2026-07-17: Initially closed this ticket having incorrectly attributed item 2 to the known pending-Nexus-approval limitation, without first confirming which install path (wishlist vs. Install From File) the reporting user actually used. Reopened after the developer corrected this, investigated further, found no code defect, then the developer opted for the broader fix (verification becomes optional/informational rather than a hard gate) rather than waiting on more diagnostic detail from the reporting user. Lesson: don't conclude a "known limitation" explains a report without confirming the user actually went through the code path that limitation affects - and when a security/safety gate turns out to be the plausible culprit behind real user friction, relaxing it for an already-privileged role (super-admin-only here) can be a faster, more robust fix than chasing the exact trigger.

---

## Closed

2026-07-17
