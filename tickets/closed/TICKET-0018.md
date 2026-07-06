# TICKET-0018

**Status**

Closed

**Type**

Feature

**Priority**

Medium

**Created**

2026-07-06

---

## Description

Moved initial setup - the super admin account, a Nexus Mods API key, and an optional first server - into the Windows installer itself, instead of requiring the user to do all of it by hand after first opening the app. Also standardized new server deployments to a fixed `data/servers/<name>` folder instead of asking the user to browse for an empty folder each time.

## Reason

The user wanted fewer manual steps after installing: name a server, create the super admin account, and optionally connect Nexus, all from the installer, with the actual server download (SteamCMD, several GB) happening during install itself with visible progress, not deferred to first app launch.

## Implementation Plan

* [x] `app/paths.py`: added `install_dir()` - the real, stable folder the installer put the `.exe` in (`Path(sys.executable).parent` when frozen), distinct from `resource_dir()` (a onefile build's temp extraction folder, gone the moment the process exits) and `data_dir()` (`%LOCALAPPDATA%`).
* [x] `app/services/deploy_jobs.py`: added `default_install_dir(name)` - every new deployment now goes in `data_dir()/servers/<sanitized name>`. The sanitizer explicitly rejects a name that reduces to `.`/`..`/empty after stripping unsafe characters (the same bug class fixed in `mod_installer._sanitize_name` a while back - character-class filtering alone lets a bare `..` straight through, since both characters are otherwise "safe").
* [x] `app/routes/instances.py`: `/deploy` no longer takes `installDir` from the client - it's computed server-side. Removed the now-unneeded `/deploy/browse` endpoint.
* [x] `web/src/components/settings/DeployServerWizard.tsx`: removed the "Install Folder" browse field entirely - just asks for a name now.
* [x] `app/services/first_run_setup.py` (new): reads a one-time seed file (`install_dir()/first_run_seed.json`) at startup and applies it using the exact same code paths the UI itself uses - `auth.create_first_super_admin`, `nexus_client.validate_key` + `nexus_session.save_record`, `deploy_jobs.start_deploy` - logging live progress to `data_dir()/first_run_progress.log`, then deleting the seed file (success or failure) so the plaintext password doesn't linger on disk. Every step has an existing manual fallback in the app (Setup screen, Nexus connect panel, Deploy Wizard), so a failure at any one step degrades gracefully rather than breaking anything.
* [x] `app/main.py`: runs `first_run_setup.apply_seed_if_present()` as a background task on startup, so it doesn't block the app itself from becoming available.
* [x] `installer.iss`: added three custom wizard pages (server name; super admin username/password/confirm, with validation; Nexus API key with an explanation of what it enables) and a progress page shown after file installation. The progress page launches the app and tails the progress log, showing live status until a `DONE` marker appears or 15 minutes elapse (then just moves on - see the fallback point above).

## Files Modified

* `app/paths.py`, `app/services/deploy_jobs.py`, `app/services/first_run_setup.py` (new), `app/routes/instances.py`, `app/main.py`
* `web/src/components/settings/DeployServerWizard.tsx`, `web/src/api/instancesApi.ts`
* `installer.iss`

## Testing

Extensive backend testing via real HTTP requests through the actual app (not just unit-level), since this is the highest-stakes flow in the app (creates the account that controls everything):

* `default_install_dir()`'s sanitizer tested against the exact traversal-adjacent inputs found dangerous elsewhere in this codebase (`.`, `..`, `....`, `../../etc`) - all correctly reduced to a safe folder name or a `Server` fallback.
* `POST /api/instances/deploy` with just a name (no `installDir`) verified end-to-end - correctly computes and creates `data/servers/<name>`.
* `first_run_setup.apply_seed_if_present()` tested directly: no seed file (no-op), valid seed (account created, seed file deleted, progress log correct), re-run with an already-existing super admin (fails gracefully, doesn't crash), malformed JSON (handled, seed file removed).
* Full app startup tested via `TestClient` with a seed file present: confirmed `/api/auth/status` shows `needsSetup: false` and login with the seeded credentials succeeds immediately after startup, without blocking.
* `installer.iss` Pascal Script compiled successfully with ISCC after fixing two real errors caught this way: `#13`/`#10` character literals at the start of a line confuse Inno Setup's preprocessor (looks like an unknown directive) - switched to `Chr(13)`/`Chr(10)`; and `TInputQueryPage` isn't the real type name - it's `TInputQueryWizardPage` (confirmed against Inno Setup's own documentation).
* Also caught and fixed: the progress-tailing loop originally used a single `Sleep(1000)` per tick, which risked the wizard window appearing frozen for minutes at a time, since Inno Setup's `[Code]` runs on the same thread as the UI. Changed to short `Sleep(250)` ticks with an explicit `WizardForm.Repaint` each tick.

**What's not automatable from this environment**: the actual interactive wizard click-through (typing into the custom pages, watching the live progress page) needs a real GUI session to test - this sandboxed shell can't drive an installer's UI, and a `/VERYSILENT` install attempt just hangs waiting for an unrelated pre-existing privilege-level dialog (`PrivilegesRequiredOverridesAllowed=dialog`), confirming this environment has no interactive desktop session available at all, not a bug introduced here. **A real manual run-through by the user is the remaining verification step.**

## Result

A fresh install now collects the super admin account, an optional Nexus API key, and an optional first server name during the installer itself, and applies them automatically the moment the app first starts - with visible live progress for the SteamCMD download, right there in the installer window.

## Notes

Flagged clearly to the user: every backend code path this depends on is thoroughly tested, but the installer's own interactive GUI flow needs a real click-through on a real desktop session to confirm the wizard pages and progress display behave as intended in practice.

## Closed

2026-07-06
