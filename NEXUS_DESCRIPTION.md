*Note: written in Markdown for easy editing. Paste the sections into Nexus's description editor (it accepts basic rich text/BBCode-style formatting: headers, bold, bullet lists, links).*

# Palworld Server Admin

A desktop admin panel for running your own Palworld Dedicated Server(s): deploy a fresh server in a few clicks, manage mods and UE4SS without touching a config file, and let friends log in with their own account to help you run it. No command line required.

## What This Is

If you've ever hosted a modded Palworld server, you know the drill: hunting down UE4SS, manually unzipping mods into the right folder, editing `PalWorldSettings.ini` by hand, fighting with port forwarding, and hoping your friends don't need admin passwords texted to them. This tool wraps all of that in a single desktop app.

It's not a mod for the game itself. It's a standalone Windows application that manages your dedicated server(s) from the outside.

## Features

**Server Management**
- Deploy a brand-new, fully isolated Palworld Dedicated Server with a few clicks. The tool runs SteamCMD for you, no manual setup.
- Or import a server you already have installed (auto-detected from your Steam library, or point it at the folder manually).
- Run multiple servers side-by-side, each completely isolated (own folder, own mods, own ports) so they can't conflict with each other. Switch between them from a dropdown in the top bar.
- Real start/stop/restart: this actually launches and manages the game server process, not a simulated status light.

**Mods**
- Browse and install mods straight from Nexus Mods (requires your own Nexus API key; downloading files requires Nexus Premium, per Nexus's own API rules).
- Enable, disable, reorder, and remove mods without ever opening a file explorer.
- Installs go into the correct UE4SS Mods folder automatically, no more guessing paths.

**UE4SS**
- One-click install/update/uninstall of UE4SS (the mod loader almost every Palworld mod needs), pulled directly from its official GitHub releases.
- Safe by design: installing or removing UE4SS never touches mods you've placed there yourself.

**Sharing With Friends**
- Automatic port forwarding for your game port via UPnP (if your router supports it), no manual router configuration.
- Shows your public IP so you can hand it straight to friends.
- Multi-user accounts: you're the super admin; generate one-time invite codes for friends so they can create their own admin account and help you manage the server. Revoke access instantly, any time.
- Optional remote access to the admin panel itself, so friends can log in and help administer from outside your network, including a one-click Windows Firewall permission request, so you don't need to touch PowerShell.

## Requirements

- Windows 10 or 11 (64-bit).
- A Steam account is **not** required: the dedicated server downloads anonymously via SteamCMD.
- A free [Nexus Mods](https://www.nexusmods.com/) account to browse mods; Nexus **Premium** is required to install/download mods through the tool (a Nexus API restriction, not this tool's).
- If you plan to let friends connect from outside your home network: a router that supports UPnP makes this automatic. Without it, you'll need to forward ports manually.

## Installation

1. Download `PalworldServerAdmin-Setup.exe` from the Files tab.
2. Run it. No admin rights required; it installs to your user profile.
3. Launch it from the Start Menu or the desktop shortcut it creates.
4. A browser window opens automatically pointing at the admin panel.

To uninstall later, use the shortcut in your Start Menu folder or Windows' "Add or Remove Programs." Your server configs and downloaded mods are kept even if you uninstall the admin tool; only the game servers you deployed yourself and their own folders are unaffected either way.

## First-Time Setup

1. On first launch, you'll be asked to create an account. **This first account becomes the permanent super admin** for this machine. There's no separate way to become super admin later, so make it yours.
2. From Settings, either:
   - Click **Deploy New Server** to install a fresh Palworld Dedicated Server from scratch, or
   - Click **Import Existing** to register a server you already have installed.
3. Once a server is active, head to the **Mods** page to start installing mods, or **Settings → UE4SS Mod Loader** to install UE4SS if you haven't already.
4. To let friends help administer: **Settings → Users & Access → New Invite**, then send them the code and your admin panel's address.

## Known Limitations

Being upfront about what's not finished yet:

- **Players, Logs, and in-game World Settings (PvP/EXP rate/etc.) are placeholders**: these don't reflect your real server yet. Mods, UE4SS, server deploy/start/stop, and multi-user accounts are fully real.
- **No graceful "save and shut down" yet.** Stopping a server currently force-stops the process after a short grace period; there's no confirmed save-on-exit. Save your world through normal in-game means before stopping if that matters to you.
- **This tool manages the UE4SS Mods folder specifically** (`Pal/Binaries/Win64/Mods`), which is what the overwhelming majority of Nexus mods use. It does not manage Palworld's separate, built-in pak-mod system.
- **Remote admin access is plain HTTP, not HTTPS.** Fine for a home network with people you trust; if you want stronger protection for remote friends, consider pairing this with a private network tool like Tailscale instead of exposing the port directly.
- Windows only.

## Troubleshooting

**Friends get a connection timeout, not an error, when trying to reach the admin panel.** This almost always means the connection never arrived. Check, in order: (1) Windows Firewall (Settings → Remote Access shows this status and can fix it with one click), (2) the router port forward is actually open, (3) your public IP hasn't changed (some ISPs rotate it).

**Mod install button is greyed out / says Premium required.** Nexus Mods restricts automated file downloads through its API to Premium accounts. Free accounts can still browse and connect an account, but installs need to be done manually from the mod's Nexus page.

**A friend's invite code doesn't work.** Codes are single-use; check Settings → Users & Access to see if it's already been claimed, and generate a fresh one if needed.

## Support

Report issues or ask questions in the Posts tab on this mod's Nexus page.

## Credits

Built with FastAPI, React, and a healthy amount of SteamCMD wrangling.

## Changelog

**v1.0.0**: Initial release: multi-server management, Nexus mod browsing/installing, UE4SS installer, real server process control, UPnP port forwarding, multi-user accounts with invites.
