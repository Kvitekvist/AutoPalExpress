# TICKET-0068

**Status**

Closed

**Type**

Feature

**Priority**

Medium

**Created**

2026-07-10

---

## Description

Follow-up to TICKET-0066/TICKET-0067: the TopBar/Sidebar chrome and World Settings are translated, but the rest of the app is still English-only. Extend the same `react-i18next` pattern (English text stays hardcoded as `t()`'s `defaultValue`, no separate English locale file needed) to every remaining page and the components they compose:

* Dashboard (`pages/Dashboard.tsx` + `components/players/PlayerCard.tsx`, `PlayersSection.tsx`)
* Mods (`pages/Mods.tsx` + `components/mods/*.tsx`)
* Server Control (`pages/ServerControl.tsx`)
* Launcher Options (`pages/LauncherFlags.tsx`)
* Logs (`pages/Logs.tsx`)
* Settings (`pages/Settings.tsx` + `components/settings/SystemStartupPanel.tsx`, `UsersPanel.tsx`, `InstanceManagerPanel.tsx`, `AutomationPanel.tsx`, `DeployServerWizard.tsx`, `ImportServerDialog.tsx`)
* Super Admin (`pages/SuperAdmin.tsx` + `components/settings/LocalApiSettingsPanel.tsx`, `PortForwardPanel.tsx`, `RemoteAccessPanel.tsx`, `NexusIntegrationPanel.tsx`, `ManualForwardInstructions.tsx`, `components/mods/InstallFromFileDialog.tsx` shared with Mods)

---

## Reason

User: "you only translated the world settings. you must also translate the dashboard, Mods, server control, launcher options, logs, settings and super admin" - confirming the earlier "full effort" scope decision (TICKET-0066/0067) applies to the whole app, not just World Settings.

---

## Implementation Plan

* [x] Dashboard + player roster (`PlayerCard`, `PlayersSection`) - stat tiles, roster search/filter tabs, guild table, kick/ban/unban/whisper dialogs and their notifications. Also fixed two spots TICKET-0066 missed: the server run-state word ("online"/"offline"/etc.) shown by `CrystalStatus` in both `Dashboard.tsx` and `TopBar.tsx` was still untranslated - added shared `serverControl.states.*` keys and wired both.
* [x] Mods page + mod dialogs/cards (`ModCard`, `NexusModCard`, `NexusModBrowser`, `NexusBrowseDialog`, `Ue4ssPanel`, `InstallFromFileDialog`) - grimoire header/counts, mod status badges, Nexus browsing/filtering/install flow, UE4SS install/update/uninstall flow.
* [x] Server Control - start/stop/restart/save, broadcast, shutdown countdown, update-check/update-job flow, all confirmation dialogs and notifications.
* [x] Launcher Options - toggle descriptions (the launch-flag names themselves, e.g. `-publiclobby`, stay literal - they're real Palworld command-line arguments, not display text).
* [x] Logs - chronicle panel, level filter tabs, export. Left `entry.message`/log line content untranslated - that's real backend-generated log text (`app/services/activity_log.py`), not app UI chrome; translating it would mean templating the backend's own log messages, out of scope here.
* [x] Settings page + panels (`SystemStartupPanel`, `UsersPanel`, `InstanceManagerPanel`, `AutomationPanel`, `DeployServerWizard`, `ImportServerDialog`) - startup recovery, users/invites, server instance list/deploy/import wizards, automation schedules (including weekday names) and backups.
* [x] Super Admin page + panels (`LocalApiSettingsPanel`, `PortForwardPanel`, `RemoteAccessPanel`, `NexusIntegrationPanel`, `ManualForwardInstructions`) - `LocalApiSettingsPanel` reuses the `worldSettings.fields.*` keys already translated in TICKET-0067 for its 3 fields (RESTAPIEnabled/RESTAPIPort/LogFormatType) rather than duplicating them.
* [x] Added the extracted string translations to all 5 non-English locale files (`web/src/i18n/locales/{zh-Hans,ja,de,fr,es}.json`).
* [x] `npm run build` clean after every page; final full build clean.
* [x] Update CHANGELOG/memory files; rebuild `PalworldServerAdmin-Setup.exe`.

---

## Files Modified

* `web/src/pages/{Dashboard,Mods,ServerControl,LauncherFlags,Logs}.tsx`, `web/src/pages/SuperAdmin.tsx`
* `web/src/components/players/{PlayerCard,PlayersSection}.tsx`
* `web/src/components/mods/{ModCard,NexusModCard,NexusModBrowser,NexusBrowseDialog,Ue4ssPanel,InstallFromFileDialog}.tsx`
* `web/src/components/settings/{SystemStartupPanel,UsersPanel,InstanceManagerPanel,AutomationPanel,DeployServerWizard,ImportServerDialog,LocalApiSettingsPanel,PortForwardPanel,RemoteAccessPanel,NexusIntegrationPanel,ManualForwardInstructions}.tsx`
* `web/src/components/layout/TopBar.tsx` (server-state label fix)
* `web/src/i18n/locales/{zh-Hans,ja,de,fr,es}.json` - new `dashboard`, `mods`, `serverControl`, `launcherOptions`, `logs`, `settings`, `superAdmin`, `localApi` sections in each.

---

## Testing

Manual, against the real running dev servers (no automated frontend test suite exists, see `.claude/memory/tech_stack.md`):

* `npm run build` (tsc + vite build) run and passed clean after each page/panel group, and once more at the very end.
* Scripted (Python) checks confirmed all 5 non-English locale files carry the same top-level namespace set (`dashboard`, `launcherOptions`, `localApi`, `logs`, `mods`, `nav`, `serverControl`, `settings`, `superAdmin`, `topbar`, `worldSettings`) with no gaps.
* Grepped every touched page/component for `useTranslation` to confirm none were skipped; `Settings.tsx` correctly has none (it only composes other translated panels, no literal text of its own).
* Not done in this sandbox: visually clicking through every page in all 6 languages in a real browser - same standing limitation as prior i18n tickets (this environment can't drive an interactive browser window). Recommend a manual pass through each nav item in a non-English language before relying on this for real non-English users.

---

## Result

The entire application is now translated in all 6 supported languages (English, Chinese Simplified, Japanese, German, French, Spanish) - every page and every panel, not just World Settings and the TopBar/Sidebar chrome from the earlier two tickets. The only intentionally untranslated user-visible text is real backend-generated content that isn't app UI copy: Palworld launch-flag names (literal CLI arguments), dropdown option *values* sent to the backend (by design, per TICKET-0067), and the Logs page's live activity-feed message text (generated server-side).

---

## Notes

If new UI copy is added to any page going forward, follow the same pattern: wrap it in `t("namespace.key", { defaultValue: "English text" })` and add the translated string to the 5 non-English locale JSON files - English needs no separate file since the `defaultValue` already covers it.

---

## Closed

2026-07-10
