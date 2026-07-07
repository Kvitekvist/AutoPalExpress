# AutoPalExpress: Palworld Dedicated Server Admin Panel

A self-hosted admin panel for a Palworld dedicated server: a FastAPI backend that actually manages the server process, plus a React (dark-fantasy themed) frontend. Runs as one process on one port when packaged; the backend also serves the built frontend directly.

## What's real vs. still mocked

Almost the entire panel is wired to a real backend and does real things on the machine it runs on. Two Players-page actions are the only remaining frontend-only mock data (`playersApi.ts`, simulated latency, no backend call) - and that's a real Palworld limitation, not something left unbuilt:

- **Whisper to a player** and **teleport a player** - mock. Palworld's RCON has no per-player whisper or teleport command, so there's no real backend equivalent possible without a different API.
- **Logs page** - still mock data (`logsApi.ts` + `mockData.ts`). Palworld's dedicated server writes its console output through its own low-level console API (confirmed live: not stdout, and no log file is written even with `-log` passed), so wiring this up for real would mean reading the game's own hidden console buffer directly - a distinctly harder problem than it looks, not yet attempted.

Everything else is real, backed by `app/`:

- **Server process control** - start/stop/restart/save actually launch and manage `PalServer.exe` (`app/services/process_manager.py`), not simulated. Runs windowless (`CREATE_NO_WINDOW`) - Palworld's own dedicated server otherwise pops up its own separate console window regardless of how it's launched. The packaged admin app itself also runs windowless (`console=False` in `PalworldServerAdmin.spec`) - the browser tab it opens is the only UI you ever see, for either process.
- **Multi-instance support** - manage multiple server installs, switch which one is "active" (`app/services/instance_store.py`), deploy new ones via SteamCMD, import existing ones (super admin only).
- **Players** - the roster, kick, and ban are real, backed by a from-scratch Source RCON client (`app/services/rcon.py`) talking directly to the live game server.
- **Automation** - scheduled backups and restarts, restart warnings, and join/leave announcements are real and actually run on schedule (`app/services/scheduler.py`), backed by the same RCON client.
- **World Settings** - a generic editor for every field in `PalWorldSettings.ini`, not a hardcoded subset (`app/services/palworld_settings.py`). The game port is deliberately excluded here - see Super Admin below.
- **Mods** - browse Nexus Mods (free accounts can browse; Premium, a paid Nexus subscription, is required for one-click automated installs), or install a manually-downloaded file with its exact hash verified against Nexus's own catalog before anything is installed (`app/routes/mods.py`, `nexus_client.md5_search`).
- **UE4SS installer** - one-click install/update of the UE4SS mod-loader itself, under Mods.
- **Super Admin** (role-gated) - the one place to view/change a server's actual game port, UPnP router port forwarding and Windows Firewall rules for both the admin panel and game ports (including seeing and removing a port mapping regardless of which machine created it), a live public-IP display for sharing with friends, and the Nexus Mods account connection.
- **Multi-user accounts** - the host machine gets exactly one super admin (first account created); friends register as regular admins via invite code. Regular admins get full day-to-day operational access (start/stop, mods, players, World Settings) but not server provisioning, user management, network exposure, or RCON/server credentials, which are reserved for the super admin.
- **Login rate limiting** - failed login attempts are throttled per IP (`app/services/login_throttle.py`) to slow down brute-forcing, since the panel can be reached from the public internet if you've set up port forwarding for it.

## Run from source

```bash
python -m venv .venv
# Windows (PowerShell): .venv\Scripts\Activate.ps1
# Windows (Git Bash):   source .venv/Scripts/activate
pip install -r requirements.txt
python Palworld_Server.py
```

This starts uvicorn on `http://0.0.0.0:8000` with auto-reload. Run the frontend separately in dev:

```bash
# terminal 1
python Palworld_Server.py

# terminal 2
cd web && npm run dev
```

The Vite dev server (`http://localhost:5173`) proxies `/api/*` to the backend (see `web/vite.config.ts`).

**Note on transport security**: the panel is plain HTTP, not HTTPS. If you port-forward it for friends to reach over the public internet, login credentials and session cookies travel unencrypted. A self-signed certificate was tried and deliberately reverted - it stops cleartext sniffing, but a self-signed cert can't be distinguished from a forged one by a browser, so every friend sees a real, unavoidable "this connection isn't private" warning on first visit (and there's no realistic way to eliminate that entirely without either owning a domain name or accepting a materially higher-risk certificate setup). Worth revisiting if a domain becomes available.

## Data storage

Persisted as JSON under `data/` (gitignored) when run from source, or `%LOCALAPPDATA%\PalworldServerAdmin\data` when running the packaged app (`app/paths.py`) - instances, mods, users/sessions, invite codes, and the Nexus connection all live there.

## Building the distributable installer

`PalworldServerAdmin.spec` packages `desktop_app.py` (the real production entry point - opens a browser to the app instead of the dev-reload server) into a single `.exe` via PyInstaller, then `installer.iss` wraps that into an Inno Setup installer (`PalworldServerAdmin-Setup.exe`) with a desktop shortcut.

The installer itself collects initial setup - a super admin username/password, an optional Nexus Mods API key, and an optional first server name - via custom wizard pages, writes them to a one-time seed file, then launches the app and shows live progress while it applies them (`app/services/first_run_setup.py`, using the exact same code paths the UI itself would call). A new server deployed this way, or later through the in-app Deploy Server Wizard, always lands in `data/servers/<name>` - there's no "choose an install folder" step anymore for new deployments (importing a server you already have installed elsewhere still lets you point at any folder).

## Known limitations

- No confirmed graceful-shutdown path: stopping the server sends `CTRL_BREAK_EVENT` and waits, but this has never been observed to save the world before the 30s timeout hits and it's hard-killed. Use the in-app "Save World" action before stopping if you want a guaranteed save.
- "Active instance" is a single value shared by everyone using the panel, not scoped per session - the Start Server dropdown on Server Control shows exactly which instance a click will affect, but two admins acting at the same time can still race.
- No automated test suite - correctness has relied on manual verification of each feature as it was built.
