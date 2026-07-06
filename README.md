# AutoPalExpress: Palworld Dedicated Server Admin Panel

A self-hosted admin panel for a Palworld dedicated server: a FastAPI backend that actually manages the server process, plus a React (dark-fantasy themed) frontend. Runs as one process on one port when packaged; the backend also serves the built frontend directly.

## What's real vs. still mocked

Most of the panel is wired to a real backend and does real things on the machine it runs on. A few pages are still frontend-only mock data (`web/src/api/*.ts` using `mockData.ts` + simulated latency, no backend calls):

- **Players** (kick/ban/message/roster) - mock data.
- **Logs** - mock data.
- **Settings → Automation** (scheduled backups/restarts toggles) - mock, not actually scheduled.
- **Server discovery/connection wizard** (`connectionApi.ts`) - mock; superseded in practice by the real Deploy Server Wizard (SteamCMD-based) and instance import flow.

Everything else is real, backed by `app/`:

- **Server process control** - start/stop/restart/save actually launch and manage `PalServer.exe` (`app/services/process_manager.py`), not simulated.
- **Multi-instance support** - manage multiple server installs, switch which one is "active" (`app/services/instance_store.py`), deploy new ones via SteamCMD, import existing ones.
- **World Settings** - a generic editor for every field in `PalWorldSettings.ini`, not a hardcoded subset (`app/services/palworld_settings.py`).
- **Mods** - browse Nexus Mods (free accounts can browse; Premium, a paid Nexus subscription, is required for one-click automated installs), or install a manually-downloaded file with its exact hash verified against Nexus's own catalog before anything is installed (`app/routes/mods.py`, `nexus_client.md5_search`).
- **UE4SS installer** - one-click install/update of the UE4SS mod-loader itself.
- **Networking** - UPnP router port forwarding and Windows Firewall rule management (both super-admin only), including a live public-IP display for sharing with friends.
- **Multi-user accounts** - the host machine gets exactly one super admin (first account created); friends register as regular admins via invite code. Regular admins get full operational access except account/network management, which is reserved for the super admin.
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

## Known limitations

- No confirmed graceful-shutdown path: stopping the server sends `CTRL_BREAK_EVENT` and waits, but this has never been observed to save the world before the 30s timeout hits and it's hard-killed. Use the in-app "Save World" action before stopping if you want a guaranteed save.
- "Active instance" is a single value shared by everyone using the panel, not scoped per session - the Start Server dropdown on Server Control shows exactly which instance a click will affect, but two admins acting at the same time can still race.
- No automated test suite - correctness has relied on manual verification of each feature as it was built.
