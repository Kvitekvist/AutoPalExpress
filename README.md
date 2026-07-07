# AutoPalExpress

<p align="center">
  <img src="https://img.shields.io/badge/Palworld-Server%20Admin-3BA6FF?style=for-the-badge" alt="Palworld Server Admin">
  <img src="https://img.shields.io/badge/Windows-10%20%2F%2011-0078D4?style=for-the-badge" alt="Windows 10 and 11">
  <img src="https://img.shields.io/badge/Install-One%20Click-2EA043?style=for-the-badge" alt="One click installer">
  <img src="https://img.shields.io/badge/Status-Community%20Release-CB9A2D?style=for-the-badge" alt="Community release">
</p>

**AutoPalExpress** is a Windows desktop app for running your own Palworld Dedicated Server without living in command windows, config files, firewall menus, and mod folders.

It opens in your browser, but it runs on your own PC. You stay in control of the server, while trusted friends can get their own admin accounts to help with day-to-day server tasks.

> [!IMPORTANT]
> AutoPalExpress is built for private servers and trusted friend groups. It is not meant to be exposed publicly to random users.

## Screenshots

| Dashboard | Mods |
| --- | --- |
| ![Dashboard](images/Dashboard.png) | ![Mods](images/Mods.png) |

| Super Admin | Logs |
| --- | --- |
| ![Super Admin](images/SuperAdmin.png) | ![Logs](images/Logs.png) |

## What It Helps With

If you just want to host a Palworld server for friends, AutoPalExpress handles the annoying parts:

- Start, stop, restart, and save the real Palworld server.
- Deploy a fresh dedicated server with SteamCMD.
- Import an existing server.
- Run multiple separate servers with their own folders, mods, and ports.
- Edit world settings from the browser.
- Install and update UE4SS.
- Browse Nexus Mods after the super admin connects a Nexus API key.
- Enable, disable, reorder, and remove mods.
- View players, kick players, and ban players through RCON.
- Schedule backups and restarts.
- Create invite codes so friends can help administer the server.
- Manage ports, Windows Firewall rules, public IP, and Nexus setup from Super Admin.

> [!TIP]
> The first account created becomes the super admin. Make sure that account belongs to the person hosting the server.

## Quick Start

1. Download `PalworldServerAdmin-Setup.exe` from the release page.
2. Run the installer.
3. Create the super admin account.
4. Deploy a new server or import one you already have.
5. Open the Mods page to install UE4SS and manage mods.
6. Invite trusted friends if you want help running the server.

> [!NOTE]
> The Palworld Dedicated Server downloads anonymously through SteamCMD. A Steam account is not required just to deploy the server.

## Remote Access And Security

AutoPalExpress uses regular HTTP by default so setup can stay simple: no domain, certificate, reverse proxy, or manual browser-trust steps.

> [!CAUTION]
> If you port-forward the admin panel, login details and session cookies are not encrypted over the internet. Only invite people you trust, never post invite codes publicly, and do not treat the panel like a public website.

> [!TIP]
> For safer remote access, use something like Tailscale, ZeroTier, a VPN, or a reverse proxy with real HTTPS.

## Nexus Mods

AutoPalExpress can browse Palworld mods from Nexus Mods once the super admin connects a Nexus Mods API key in **Super Admin**.

> [!NOTE]
> Nexus Premium is required for one-click automatic downloads because Nexus restricts automated downloads through its API. That is a Nexus rule, not an AutoPalExpress rule.

Free Nexus accounts can still browse mods. For manual downloads, AutoPalExpress verifies the uploaded file against Nexus' own file catalog before installing it.

## Logs And Windows

The app intentionally leaves command windows visible:

- The AutoPalExpress console window shows the app running.
- The Palworld server window shows the dedicated server running.
- The Logs page shows AutoPalExpress output and server activity side by side.

> [!WARNING]
> Palworld's own server-window text cannot currently be mirrored into the browser. The game does not expose that text as normal stdout or a log file, so the real Palworld window stays visible separately.

## What Is Real

Most of the app is wired to the real machine and real server:

- Server process control is real.
- Multi-server management is real.
- Player roster, kick, and ban are real through RCON.
- Scheduled backups and restarts are real.
- World Settings edits the real `PalWorldSettings.ini`.
- Mods and UE4SS install to disk.
- Super Admin networking tools affect real ports and Windows Firewall rules.
- Logs show real AutoPalExpress output and real activity events.

<details>
<summary>Current limitations</summary>

- Whisper and teleport are shown as UI concepts only. Palworld RCON does not provide per-player whisper or teleport commands.
- Stop/restart should be treated carefully. Use **Save World** before stopping if you want a guaranteed save.
- The active server selection is shared by everyone using the panel.
- AutoPalExpress manages the UE4SS Mods folder, not Palworld's separate pak-mod system.
- Windows SmartScreen may warn because the installer is not code-signed yet.

</details>

## Installer Verification

After building a release, publish the SHA-256 checksum beside the installer so users can verify the file.

Current release build:

```text
SHA256  PalworldServerAdmin-Setup.exe  580C187244F9F09416A0114B42D082657992A790813950D335ABEDDB34D69AD5
```

> [!IMPORTANT]
> If the installer is rebuilt, the checksum changes. Update this section and `installer_output/CHECKSUMS.txt` after every release build.

## For Developers

<details>
<summary>Run from source</summary>

```bash
python -m venv .venv
# Windows PowerShell:
# .venv\Scripts\Activate.ps1
pip install -r requirements.txt
python Palworld_Server.py
```

Run the frontend separately in development:

```bash
cd web
npm install
npm run dev
```

The Vite dev server proxies `/api/*` to the backend.

</details>

<details>
<summary>Build the Windows installer</summary>

```powershell
powershell -ExecutionPolicy Bypass -File .\build_installer.ps1
```

Outputs:

- `dist/PalworldServerAdmin.exe`
- `installer_output/PalworldServerAdmin-Setup.exe`

</details>

## Where Data Is Stored

When installed, app data is stored under:

```text
%LOCALAPPDATA%\PalworldServerAdmin\data
```

This includes server registry data, users, sessions, invites, mod records, and the Nexus connection.

## Support

Use the GitHub issues page or the release/community post where you found the download.
