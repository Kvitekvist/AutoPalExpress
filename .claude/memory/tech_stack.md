# Technology Stack

This document is the authoritative reference for the project's technical environment.

Update it whenever the technology stack changes.

---

# Project Information

**Project Name:** AutoPalExpress

**Version:** 1.0.0 (see installer.iss)

**Created:** 2026 (exact start date predates this memory system; actively developed through 2026-07-05/06)

---

# Programming Language

Language: Python (backend), TypeScript (frontend)

Version: Python 3.11, Node.js (version used by the dev environment's npm)

---

# Framework

Name: FastAPI (backend), React 19 + Vite (frontend)

Version: fastapi>=0.115, see web/package.json for frontend versions

Purpose: FastAPI serves the JSON API and, in the packaged app, also serves the built frontend as static files from the same process/port. React/Vite is the SPA frontend, dark-fantasy themed (Tailwind CSS v4, Framer Motion, Radix UI primitives styled from scratch).

---

# Runtime

* Python (backend, via a project-local `.venv`)
* Node.js (frontend dev tooling only - not needed at runtime once built)
* Windows-only (uses `netsh`, Windows Firewall, `CTRL_BREAK_EVENT`, PyInstaller Windows builds)

---

# Package Manager

* pip, via `requirements.txt` (backend)
* npm, via `web/package.json` (frontend)

---

# Build System

* PyInstaller (onefile mode) packages `desktop_app.py` into `PalworldServerAdmin.exe` per `PalworldServerAdmin.spec`
* Inno Setup 6 compiles `installer.iss` into `PalworldServerAdmin-Setup.exe` (wraps the PyInstaller exe with a desktop shortcut, Start Menu entry, uninstaller)
* `npm run build` produces the frontend's `web/dist`, which PyInstaller bundles in via the spec's `datas`

---

# Development Environment

Operating System: Windows 11

IDE: not fixed/required by the project

Compiler: n/a (Python is interpreted; TypeScript is transpiled by Vite/esbuild)

SDK: n/a

---

# Dependencies

Backend (`requirements.txt`):

| Library | Version | Purpose |
| ------- | ------- | ------- |
| fastapi | >=0.115 | Web framework / API routing |
| uvicorn[standard] | >=0.32 | ASGI server |
| httpx | >=0.27 | Outbound HTTP (Nexus Mods API, public-IP echo services, UPnP SOAP calls) |
| pydantic | >=2.9 | Request/response models |

Notable direct implementations (deliberately, to avoid unnecessary dependencies): UPnP IGD client (`app/services/upnp.py`), Windows Firewall UAC elevation (`app/services/firewall.py`), password hashing via `hashlib.pbkdf2_hmac` (`app/services/auth.py`), and the Palworld REST API wrapper (`app/services/palworld_rest.py`, using existing `httpx`).

Frontend (`web/package.json`, key ones): react, react-router-dom, framer-motion, @radix-ui/* (dialog/select/tabs/switch primitives, restyled), tailwindcss v4 (CSS-based theme config, no `tailwind.config.js`), lucide-react (icons), i18next + react-i18next (multi-language UI, see `web/src/i18n/`; flags are inline emoji, no icon dependency added for them).

---

# External Services

* **Nexus Mods APIs** (`api.nexusmods.com/v2/graphql`, legacy `api.nexusmods.com/v1`) - public GraphQL is used for mod browsing and manual-file hash verification without a personal API key. Legacy v1 API-key validation remains for backward compatibility/testing only; automated Nexus downloads are paused until the registered app/OAuth path is approved.
* **SteamCMD** - anonymous login, used to install/update the Palworld Dedicated Server itself (appid 2394010, free, no owned license needed).
* **UE4SS releases** (`UE4SS-RE/RE-UE4SS` on GitHub) - the mod loader most Palworld mods require; installed/updated by downloading GitHub release assets directly.
* **Public IP echo services** (api.ipify.org, ifconfig.me, icanhazip.com - first to respond wins) - used to show the host's public address for sharing with friends, independent of whether UPnP works.
* **The Palworld dedicated server itself** - controlled via direct process management (start/stop the real `PalServer.exe`) and Palworld's local REST API for in-game/server commands (announce, save, metrics, player list, kick/ban/unban, shutdown).

---

# Storage

* JSON files under `data/` (when run from source) or `%LOCALAPPDATA%\PalworldServerAdmin\data` (when running the packaged app) - see `app/paths.py`.
* No database. Per-instance data lives under `data/instances/<id>/*.json` (mods, automation schedules, UE4SS install record, mods-path override, backups).
* No secrets are stored encrypted at rest currently - PBKDF2 password hashes live in plain JSON files on the local machine. Older installs may still have a saved Nexus API key in `nexus.json`, but the public release flow no longer requires one and the Super Admin panel can remove it.

---

# APIs

* **Nexus Mods GraphQL API v2** - unauthenticated metadata browsing (`mods`) and MD5 file-hash lookup (`fileHash`) with `Application-Name`/`Application-Version` headers. This avoids using a personal API key for the public browse/manual-install flow.
* **Nexus Mods API v1** - legacy API-key validation only at the moment. Do not re-enable automated download/link endpoints for public releases until Nexus approves the registered app/OAuth approach.
* **Palworld REST API** - local HTTP API at `/v1/api/*`, gated by `RESTAPIEnabled`/`RESTAPIPort`/`AdminPassword` in that server's `PalWorldSettings.ini`. Implemented in `app/services/palworld_rest.py` with HTTP Basic Auth username `admin`. Used for `/info`, `/metrics`, `/players`, `/announce`, `/save`, `/kick`, `/ban`, `/unban`, and graceful `/shutdown` attempts.

---

# Build Output

* `PalworldServerAdmin.exe` (PyInstaller onefile) - not distributed directly.
* `PalworldServerAdmin-Setup.exe` (Inno Setup) - the actual distributable, installs to the user's profile (no admin rights required), creates a desktop shortcut.

---

# Deployment

Manual: build the frontend, run PyInstaller, compile the Inno Setup script, distribute the resulting `-Setup.exe` (e.g. via Nexus Mods, see `NEXUS_DESCRIPTION.md`). No CI/CD pipeline exists.

---

# Required Tools

* Python 3.11+
* Node.js + npm
* Inno Setup 6 (for building the installer; not required to just run the app)
* Windows 11 (or 10) - the whole project is Windows-only

---

# Environment Variables

None required for normal operation. `%LOCALAPPDATA%` (a standard Windows environment variable, not one this project defines) determines where the packaged app's data directory lives.

---

# Notes

* No TLS/HTTPS - this was built, tested, and then **deliberately reverted** at the user's request (self-signed certs caused browser warnings that couldn't be fully eliminated without a real domain name or a riskier CA-based workaround that was correctly blocked by a safety check). The panel is plain HTTP; see memory/decisions.md.
* No automated test suite. Every feature in this project has been verified through live manual testing (direct Python function calls bypassing HTTP where convenient, real UAC prompts, real UPnP routers, a real connected Palworld player during server API testing, etc.) rather than unit/integration test files - if that ever changes, update `tests_required` above.
