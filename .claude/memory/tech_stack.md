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

Notable stdlib-only implementations (deliberately, to avoid new dependencies): UPnP IGD client (`app/services/upnp.py`), Windows Firewall UAC elevation (`app/services/firewall.py`), password hashing via `hashlib.pbkdf2_hmac` (`app/services/auth.py`), and the Palworld RCON client (`app/services/rcon.py`, raw Source RCON protocol over `asyncio` streams).

Frontend (`web/package.json`, key ones): react, react-router-dom, framer-motion, @radix-ui/* (dialog/select/tabs/switch primitives, restyled), tailwindcss v4 (CSS-based theme config, no `tailwind.config.js`), lucide-react (icons).

---

# External Services

* **Nexus Mods API** (`api.nexusmods.com/v1`) - mod browsing/install; requires a user-supplied personal API key; automated file downloads require Nexus Premium (a paid Nexus subscription, not a limitation of this tool).
* **SteamCMD** - anonymous login, used to install/update the Palworld Dedicated Server itself (appid 2394010, free, no owned license needed).
* **UE4SS releases** (`UE4SS-RE/RE-UE4SS` on GitHub) - the mod loader most Palworld mods require; installed/updated by downloading GitHub release assets directly.
* **Public IP echo services** (api.ipify.org, ifconfig.me, icanhazip.com - first to respond wins) - used to show the host's public address for sharing with friends, independent of whether UPnP works.
* **The Palworld dedicated server itself** - controlled via direct process management (start/stop the real `PalServer.exe`) and RCON (Source RCON protocol) for in-game commands (broadcast, save, player list, kick/ban).

---

# Storage

* JSON files under `data/` (when run from source) or `%LOCALAPPDATA%\PalworldServerAdmin\data` (when running the packaged app) - see `app/paths.py`.
* No database. Per-instance data lives under `data/instances/<id>/*.json` (mods, automation schedules, UE4SS install record, mods-path override, backups).
* No secrets are stored encrypted at rest currently - the Nexus API key and PBKDF2 password hashes live in plain JSON files on the local machine (acceptable for a single-user-controlled local admin tool; worth revisiting if that threat model ever changes).

---

# APIs

* **Nexus Mods API v1** - auth via `apikey` header (a personal key, not OAuth). Rate-limited (`X-RL-Hourly-Remaining`/`X-RL-Daily-Remaining` headers returned but not currently surfaced in the UI). No free-text search endpoint - only curated lists (trending/latest_added/latest_updated), exact mod-ID lookup, and an MD5-based reverse file lookup (`md5_search`) used to cryptographically verify manually-uploaded mod files.
* **Palworld RCON** - Source RCON protocol (the same one Valve-engine games use), TCP, gated by `RCONEnabled`/`RCONPort`/`AdminPassword` in that server's `PalWorldSettings.ini`. Implemented from scratch in `app/services/rcon.py`. Confirmed live: auth (including a real double-packet auth-response quirk), `Broadcast`, `Save`, `ShowPlayers`, `KickPlayer`/`BanPlayer`/`UnBanPlayer`.

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
* No automated test suite. Every feature in this project has been verified through live manual testing (direct Python function calls bypassing HTTP where convenient, real UAC prompts, real UPnP routers, a real connected Palworld player during RCON testing, etc.) rather than unit/integration test files - if that ever changes, update `tests_required` above.
