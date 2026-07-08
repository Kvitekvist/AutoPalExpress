# Project Architecture

## Overview

AutoPalExpress is a self-hosted admin panel for one or more Palworld Dedicated Servers, run by a host (the "super admin") who wants to let friends ("admins") help manage the server(s) without giving out SSH/file access or admin passwords directly. A FastAPI backend does real, live things to the machine it runs on (launches/stops the actual game process, edits the actual `PalWorldSettings.ini`, talks to the game server over Palworld's local REST API, forwards router ports, adds Windows Firewall rules); a React frontend (dark-fantasy themed) is the UI for all of it. In the packaged build, both run as a single process on a single port - the backend serves the built frontend directly.

---

## Components

### User Interface

React 19 + Vite SPA (`web/src/`). Pages: Dashboard (now includes the player roster, merged in), Mods (installed-mod enable/disable/reorder plus Nexus metadata browsing and UE4SS management - install-from-file lives on Super Admin instead, not here), Server Control, World Settings (generic `.ini` editor, deliberately excludes the game port - see Super Admin), Settings (role-gated, super admin only: instance provisioning/removal, per-server Community Server listing and safe launch-option toggles, automation/backups, user/invite management), Super Admin (role-gated: active server's disk path, the one place to view/edit/save the game port, port-forward management for both the admin and game ports, firewall, Nexus integration status, and verified mod install-from-file uploads). Both Settings and Super Admin are hidden from nav and route-guarded (redirect to Dashboard) for non-super-admins - a regular admin's day-to-day surface is Dashboard, Mods, Server Control, World Settings, and Logs. High-risk/disk-writing actions are deliberately consolidated onto Super Admin rather than conditionally hidden within pages regular admins also use. Styled with Tailwind CSS v4 (CSS-based theme, no `tailwind.config.js`) and custom "fantasy" components (`RuneButton`, `ScrollPanel`, `CrystalStatus`, etc.) wrapping restyled Radix UI primitives.

### Backend

FastAPI app (`app/main.py`). Routes live in `app/routes/*.py`, one file per feature area (auth, users, instances, mods, nexus, network, server_control, server_settings, automation, players, ue4ss). Business logic lives in `app/services/*.py` - routes are thin, services do the real work (process management, Palworld REST API calls, file I/O, external API calls). A background `asyncio` task (`app/services/scheduler.py`, started on FastAPI startup) drives scheduled backups/restarts/messaging.

### Database

None. See "Storage" below - flat JSON files instead, since this is a single-host, small-scale local tool with no need for a real database.

### Networking

* UPnP IGD client (`app/services/upnp.py`) - from-scratch SSDP discovery + SOAP calls, for automatic router port forwarding (both the game port and, separately, the admin panel's own port for remote access).
* Windows Firewall rule management (`app/services/firewall.py`) - UAC-elevated `netsh` calls via a temp `.bat` + `Start-Process -Verb RunAs`, so the user gets Windows' own permission prompt instead of needing to open PowerShell themselves.
* Palworld REST API client (`app/services/palworld_rest.py`) - local HTTP Basic Auth client for `/v1/api/*`, used for broadcast messages, forced saves, metrics/info, player list, kick/ban/unban, and graceful shutdown attempts.
* Plain HTTP only (no TLS) - see Decision Log.

### Services

Notable ones beyond the obvious CRUD: `process_manager.py` (real process lifecycle for `PalServer.exe`, including killing the whole process tree since the exe is a thin launcher for a child process; builds the per-instance launch arguments for `-publiclobby`, performance flags, `-NumberOfWorkerThreadsServer`, and JSON log format; Dashboard status also discovers matching `PalServer.exe`/`PalServer-Win64-Shipping-Cmd.exe` processes inside the selected server folder so CPU/RAM can recover when the remembered launcher tree is incomplete; intentionally leaves the Palworld server window visible, but still cannot capture that window text because Palworld does not write it to stdout), `palworld_settings.py` (generic `PalWorldSettings.ini` reader/writer - infers field types from formatting rather than hardcoding Palworld's ~108-field schema, so it doesn't go stale across game updates), `scheduler.py` (the automation loop), `backup_service.py`, `steamcmd.py` (deploying brand-new servers into `data_dir()/servers/<name>` by default, or into a super-admin-selected parent folder via `deploy_jobs.install_dir_for()`), `nexus_client.py` / `mod_installer.py` (GraphQL Nexus metadata browsing and MD5-hash verification against Nexus's own catalog for manually-uploaded files; automated Nexus downloads paused pending registered app/OAuth approval), `first_run_setup.py` (applies the installer's one-time seed file - super admin account and optional first server - on first launch, using the same code paths the UI itself calls), `activity_log.py` and `app_log_reader.py` (Logs page data: app activity JSONL plus AutoPalExpress' own `backend.log` tail).

---

## Folder Responsibilities

```
app/
  main.py            FastAPI app setup, router registration, startup hooks
  paths.py           Resolves data_dir()/resource_dir()/install_dir() - dev vs. PyInstaller-frozen
  auth_deps.py        get_current_user / require_super_admin FastAPI dependencies
  routes/            One file per feature area - thin, delegate to services/
  services/          Real logic: process control, Palworld REST, file I/O, external APIs

web/
  src/
    pages/           Top-level routed pages
    components/
      ui/            Bare Radix-based primitives
      fantasy/       Themed, reusable pieces built on top of ui/
      layout/        Sidebar, TopBar, AppShell
      settings/, mods/, players/   Feature-specific panels/dialogs
    api/             One module per backend feature area, thin fetch wrappers
    hooks/           useAuth, useServerStatus, useNotifications
    types/models.ts  Shared TypeScript interfaces matching backend response shapes

data/ (dev) or %LOCALAPPDATA%\PalworldServerAdmin\data (packaged)
  instances.json                     Registry of managed server instances
  instances/<id>/*.json              Per-instance state (mods, automation config, backups/)
  users.json, sessions, invites.json Auth state
  nexus.json                         Legacy Nexus Mods account connection, if an older install saved one
```

---

## Dependencies

See `memory/tech_stack.md` for the full list and versions. The recurring theme: **avoid new dependencies for things that can be implemented directly** (UPnP, Palworld REST wrapper, firewall elevation, password hashing are all stdlib/httpx/from-scratch) - this keeps the PyInstaller build simple and avoids dependency-version churn for a small, single-maintainer project.

---

## Design Principles

* **Generic over hardcoded, where the underlying thing can change out from under you.** `palworld_settings.py` infers field types from how Palworld itself formatted a value rather than hand-maintaining a schema of ~108 fields that would go stale on every game update.
* **Multi-instance from the ground up.** The tool manages N independent, fully isolated Palworld server installs (own folder, own mods, own ports) rather than one global server path, specifically to avoid mod conflicts between different servers. Most services take an `instance`/`instance_id` parameter rather than reading global config.
* **Minimal dependencies.** Prefer a small direct implementation (Palworld REST wrapper, UPnP, firewall elevation) over pulling in a library, when the protocol/mechanism is small enough to implement directly and doing so avoids a new dependency in the PyInstaller build.
* **Fail open to "tell the user clearly," not silently or with a crash.** REST-unavailable, UPnP-unavailable, and similar "the environment isn't set up for this yet" conditions are modeled as expected, frequent, non-exceptional outcomes with clear user-facing messages - not 500s.
* **Verify live, not just in theory.** Nearly every feature in this project was tested against the real, running Palworld server on the developer's own machine (real UAC prompts, a real connected player for RCON testing, a real router for UPnP, a real PyInstaller build for packaging) rather than trusting untested code.
* **Security decisions favor the smaller blast radius.** E.g., mod installation moved from "trust a claimed source URL" to "verify the file's exact hash against Nexus's own catalog"; a self-signed-cert-as-CA approach was rejected specifically because a stolen private key would have had a much bigger blast radius than the problem it solved.

---

## Future Improvements

* No automated test suite - correctness currently relies entirely on manual/live verification.
* `process_manager`'s command/control tracking is in-memory only and resets on a backend restart, even though the real game process keeps running. Dashboard status can rediscover matching Palworld processes for CPU/RAM, but full process adoption for Stop/Restart control is still missing.
* No TLS. Revisit if a real domain name ever becomes available (see Decision Log) - would make Let's Encrypt or a stable Cloudflare Tunnel practical.
* Several pages/fields are still frontend-only mock data with no backend: the general Settings blob's own fields (server name/password/difficulty/PvP/exp-rate/day-night-length - note this is distinct from the real, backend-backed World Settings `.ini` editor). `sendPlayerMessage` (whisper to one player) and `teleportPlayer` on the Players page are also unimplemented since Palworld's REST API has no per-player whisper/teleport command.
