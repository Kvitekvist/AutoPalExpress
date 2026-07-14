# TICKET-0132

**Status**

Closed

**Type**

Bug / Enhancement

**Priority**

High

**Created**

2026-07-14

---

## Description

User report: after a fresh install where the installer collected a server name ("Kraken_1_0") and deployed it during setup, the app showed "No server" instead of the newly created one, even though the server had actually deployed.

Investigation found the installer-seeded deploy flow (`installer.iss`'s `ServerNamePage`/`ServerInstallDirPage` -> `first_run_seed.json` -> `first_run_setup.py`'s `apply_seed_if_present()` -> `deploy_jobs.start_deploy()`) has structural fragility that makes exactly this kind of failure possible:
* It runs as a fire-and-forget background `asyncio.create_task()` at app startup - a real SteamCMD download can take minutes, during which `/instances` legitimately returns empty.
* `Dashboard.tsx` fetches the active instance exactly once on mount (unlike `TopBar.tsx`'s `InstanceSwitcher`, which already re-polls for this exact reason) - landing on the Dashboard while the seeded deploy is still running (or right as it finishes) leaves the "No server" banner stuck until a manual reload.
* `_run_deploy`'s exception handling only catches `SteamCmdError`/`OSError` - anything else escapes uncaught, silently killing the background task before `instance_store.create_instance()` ever runs, while the server folder may already exist on disk from a completed SteamCMD download.

Rather than hardening this fragile fire-and-forget flow further, the user asked for a structural fix instead: remove server creation from the installer entirely, and force the super admin to create their first server through the app's own (already-reliable, synchronously-polled) Deploy/Import flow the first time they log in and no server exists yet.

---

## Reason

Direct user report and requested design: "So to get by this, I think in stead we remove the optoin from the installer, and we instead force popoup on the first time the super admin logs in, that they get the promt to Create new server."

---

## Implementation Plan

* [x] `installer.iss`: removed `ServerNamePage`/`ServerInstallDirPage` entirely - their creation in `InitializeWizard`, their `ShouldSkipPage` branches, the `ServerInstallDirPage.Values[0]` default assignment in `NextButtonClick(wpSelectDir)`, and `BuildSeedJson`'s `serverName`/`serverInstallParentDir` logic. `HasServerData()`/`ServerDataExists` were unused once this was done - removed them and simplified `CurStepChanged`'s "nothing left to provision" check to just `AdminAccountExists`. Kept `SuperAdminPage`.
* [x] `app/services/first_run_setup.py`: removed the `serverName`/`serverInstallParentDir`/`deploy_jobs`/`_wait_for_deploy` block from `apply_seed_if_present()` - the seed file now only ever carries the super admin account. Also removed the already-dead `nexusApiKey` block noticed during investigation and the now-unused imports (`deploy_jobs`, `nexus_client`, `nexus_session`, `NexusApiError`, `asyncio`).
* [x] New `web/src/components/onboarding/FirstServerPrompt.tsx`: fetches `instancesApi.list()` once; if the logged-in user is `super_admin` and zero instances exist, renders a full-screen, non-dismissible takeover with two actions reusing the existing `DeployServerWizard`/`ImportServerDialog` components - both call `window.location.reload()` on success. Non-super-admins never see it.
* [x] Wired `<FirstServerPrompt />` into `AppShell.tsx`.
* [x] Verified with `py_compile`/`tsc --noEmit`, a full rebuild, and a real, complete, GUI-automated fresh-install test.

---

## Files Modified

* `installer.iss`
* `app/services/first_run_setup.py`
* `web/src/components/onboarding/FirstServerPrompt.tsx` (new)
* `web/src/components/layout/AppShell.tsx`
* `web/src/components/settings/DeployServerWizard.tsx` (unrelated small addition bundled in: clarified the deploy description mentions the SteamCMD download can take a few minutes, per a follow-up user request in the same conversation)

---

## Testing

* `python -m py_compile app/services/first_run_setup.py` - passes.
* `npx tsc --noEmit` - passes with no errors.
* `ISCC.exe installer.iss` and full `scripts\build.bat` rebuild - both compile/build cleanly.
* Real, complete, GUI-automated end-to-end install test against the actual compiled installer (not just code review): drove the real wizard through every page via `SendMessage`/`SendKeys` (Install Mode -> Select Destination -> Select Tasks -> **directly to Super Admin Account, confirming no server-name/install-location pages appear in between** -> Ready to Install -> Install), filled in real account fields via `WM_SETTEXT` on the located `TPasswordEdit` controls, and let it finish and auto-launch the app. Confirmed via the real resulting files: `Documents\AutoPalExpress\data\users.json` had the real created account, `instances.json` correctly showed `{"activeId": null, "instances": []}` (zero servers, exactly the condition that triggers `FirstServerPrompt`), and `first_run_progress.log` went straight from "Created super admin account" to "DONE" with no deploy step at all. The app was responding (`HTTP 200`) throughout. All real state this test created (Documents folder, Start Menu folder, Desktop shortcut, uninstall registry key, startup Run key value, scratch install folder) was found and removed immediately afterward.
* Did not additionally drive a full browser login + visual confirmation of `FirstServerPrompt`'s rendered overlay (no screenshot/visual-inspection tool available) - confidence here rests on the confirmed-correct backend state (the exact condition the component's logic checks), a clean `tsc` compile, and direct code review of the straightforward conditional-render logic, consistent with the verification depth used for comparable simple UI components elsewhere in this session.
* New installer checksum: `1476C0EA74F801DD5FF5FAA1335AAFDCC42ED53FEEA06CBDBEA3BAC2B75CBAA9`.

---

## Result

The installer no longer deploys a server during setup - confirmed via a real, complete, automated install that account creation still works and zero servers are registered afterward, exactly matching the intended handoff to the app's own forced first-login prompt.

---

## Notes

Process note: this GUI automation (multi-page wizard navigation via `SendMessage`, real form-field population via `WM_SETTEXT` on `TPasswordEdit` controls, completing a full real install) is more thorough than earlier single-dialog tests in this session and worth remembering as a technique for future installer verification work.

---

## Closed

2026-07-14
