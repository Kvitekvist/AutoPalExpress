# TICKET-0166

**Status**

Closed

**Type**

Feature

**Priority**

Medium

**Created**

2026-07-17

---

## Description

Add a "Privacy Mode" toggle to Super Admin. When on, IP addresses and folder paths are masked everywhere they appear in the app, so it's safe to stream or screen-share without leaking network info or install locations.

---

## Reason

Direct user request: "make a privacy mode toggle i super admin. When it is toggled on, then all IP and folder pathes are masked."

---

## Implementation Plan

* [x] Surveyed the whole frontend for every place an IP or folder path is displayed, and whether it's a passive display or an interactive folder-picker echo (deploy/import/save-import dialogs need the real path to confirm the right folder was picked - masking those would make them unusable).
* [x] `app/services/system_settings.py`: added `privacyMode` to the existing machine-wide settings blob (`_DEFAULTS`, `update_config()`), alongside `bootWithWindows`/`autoStartActiveServer`.
* [x] `app/routes/system_settings.py`: `SystemSettingsRequest` gained `privacyMode`, threaded through to `update_config()`.
* [x] New `app/services/privacy.py`: `is_enabled()`, `mask_ip()`, `mask_path()`, `scrub_text()` (regex-based free-text redaction for the diagnostics report blob). Masking happens server-side, before values ever reach the browser - not a client-side visual-only blur - matching the existing precedent in `app_log_reader.py`'s IP masking for non-super-admins.
* [x] Applied masking at every passive-display response site found in the survey: `app/routes/network.py` (`externalIp`, `localIp`, `internalClient` in UPnP status/forward/mapping responses), `app/routes/instances.py`'s `_instance_view()` (`serverPath`, `modsPath`), `app/services/mods_shared.py`'s `mods_path_view()` (`modsPath`), `app/services/diagnostics.py` (`report` text scrubbed, `reportPath` masked).
* [x] `app/routes/logs.py`: Privacy Mode now also masks IPs in the AutoPalExpress console log for the super admin (previously that log's IP-masking was role-based only - regular admins always masked, super admin always real - Privacy Mode overrides that for everyone while it's on).
* [x] Deliberately left unmasked: `DeployServerWizard`/`ImportServerDialog`/`SaveImportDialog`'s folder-picker echoes - the admin is actively choosing a folder and needs to see it to confirm correctness before committing.
* [x] Frontend: renamed `SystemStartupSettings` type to `SystemSettings` (no longer just startup-related) across `models.ts`/`systemSettingsApi.ts`/`SystemStartupPanel.tsx`. New `web/src/components/settings/PrivacyModePanel.tsx` (own `ScrollPanel`, `EnchantedToggle`, matches `SystemStartupPanel.tsx`'s save pattern) added to `SuperAdmin.tsx`, per the explicit request to put it there rather than the more generic `Settings.tsx` (where `SystemStartupPanel` already lives, despite sharing the same backend settings blob).
* [x] Because masking happens server-side, no other frontend component needed any changes - they already just render whatever the backend sends, which is transparently pre-masked.
* [x] New `tests/test_privacy.py`: unit tests for the masking helpers on/off, a route-level round-trip test for the settings toggle, and route-level tests confirming `serverPath`/`modsPath` actually come back masked through `/api/instances` and `/api/mods/mods-path` once Privacy Mode is on. Monkeypatches `system_settings._write_run_value` since it unconditionally raises off Windows regardless of the value passed - caught this only by remembering TICKET-0165's lesson that CI's backend-tests run on `ubuntu-latest`, not by assuming a local Windows pass was sufficient.
* [x] Locale keys (`settings.privacy.*`) added to all 5 non-English translation files.

---

## Files Modified

`app/services/system_settings.py`, `app/routes/system_settings.py`, new `app/services/privacy.py`, `app/routes/network.py`, `app/routes/instances.py`, `app/services/mods_shared.py`, `app/services/diagnostics.py`, `app/routes/logs.py`, new `tests/test_privacy.py`, `web/src/types/models.ts`, `web/src/api/systemSettingsApi.ts`, `web/src/components/settings/SystemStartupPanel.tsx`, new `web/src/components/settings/PrivacyModePanel.tsx`, `web/src/pages/SuperAdmin.tsx`, `web/src/i18n/locales/{de,es,fr,ja,zh-Hans}.json`.

---

## Testing

Backend: full `pytest -v` (133 passed, 5 new) + `ruff check`/`format --check` clean. Frontend: `npm run typecheck`/`lint`/`format:check`/`build` all clean. Manual click-through (toggling it live and confirming every panel actually shows masked values) not possible in this sandbox - no interactive browser session, same limitation as the rest of this project's UI history. `network.py`'s masking specifically wasn't exercised by an automated test either, since it depends on real UPnP discovery/outbound network calls unsuitable for a hermetic test - verified by reading the code instead.

---

## Result

Privacy Mode is a single machine-wide toggle (Super Admin > Privacy Mode) that masks IPs and folder paths at the API layer for every user, immediately, without needing any changes to the many individual components that display them - the masking happens once, centrally, before the data ever leaves the server.

---

## Notes

Flagged for live verification: toggling it on and checking Remote Access / Share With Friends (IPs), Server Instances / Super Admin's Active Server card (paths), and a real diagnostics report (both, plus the free-text scrub) actually render masked. Also worth confirming the "still shows real paths" claim for the deploy/import pickers matches expectations - that was a deliberate scope decision, not an oversight, but worth the developer explicitly signing off on given the user's literal request said "all folder paths."

---

## Closed

2026-07-17
