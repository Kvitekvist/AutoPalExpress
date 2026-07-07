*Note: written in Markdown for easy editing. Paste the sections into Nexus's description editor.*

# Palworld Server Admin

A desktop admin panel for running your own Palworld Dedicated Server(s): deploy a fresh server in a few clicks, manage mods and UE4SS without touching config files, and let friends log in with their own account to help run the server. No command line required.

## What This Is

If you've ever hosted a modded Palworld server, you know the drill: hunting down UE4SS, manually unzipping mods into the right folder, editing `PalWorldSettings.ini` by hand, fighting with port forwarding, and hoping your friends don't need admin passwords sent to them. This tool wraps those jobs in one desktop app.

It's not a mod for the game itself. It's a standalone Windows application that manages your dedicated server from the outside.

## Features

**Server Management**
- Deploy a brand-new, isolated Palworld Dedicated Server with a few clicks. The tool runs SteamCMD for you.
- Or import a server you already have installed.
- Run multiple servers side by side, each with its own folder, mods, and ports.
- Real start/stop/restart/save actions that manage the actual server process.

**Mods**
- Browse mods from Nexus Mods after the super admin connects a Nexus Mods API key in Super Admin.
- One-click downloads require Nexus Premium, per Nexus's own API rules. Free accounts can still browse and install manually downloaded files after the tool verifies their exact hash against Nexus's catalog.
- Enable, disable, reorder, and remove mods without digging through folders.
- Installs go into the correct UE4SS Mods folder automatically.

**UE4SS**
- One-click install/update/uninstall of UE4SS from the Mods page, pulled from its official GitHub releases.
- Installing or removing UE4SS leaves your installed mods alone.

**Players, Settings, and Logs**
- See the live player roster through RCON, including kick and ban actions.
- Edit Palworld world settings from the browser instead of hand-editing `PalWorldSettings.ini`.
- View AutoPalExpress output and server activity side by side in the Logs page. Palworld's own server window remains visible separately because the game does not expose that window text as a normal log stream.

**Sharing With Friends**
- Automatic port forwarding for your game port via UPnP, if your router supports it.
- Shows your public IP so you can send it to friends.
- Multi-user accounts: you are the super admin; friends join through invite codes as regular admins.
- Optional remote access to the admin panel itself, including one-click Windows Firewall permission prompts.

## Security / Remote Access

This is built for private servers and trusted friend groups. The admin panel uses regular HTTP by default so the installer can stay truly one-click with no domain or certificate setup. If you port-forward the admin panel, only invite people you trust, don't post invite codes publicly, and remember that login details are not encrypted over the network.

For stronger remote access, use a private network tool like Tailscale or put the panel behind a reverse proxy with real HTTPS.

The installer is not code-signed yet, so Windows SmartScreen may warn on first run. That's expected for an unsigned community tool; verify the file came from the official download page before installing.

## Requirements

- Windows 10 or 11, 64-bit.
- A Steam account is not required: the dedicated server downloads anonymously via SteamCMD.
- A free Nexus Mods account to browse mods; Nexus Premium is required for one-click mod downloads through the Nexus API.
- If you plan to let friends connect from outside your home network: a router that supports UPnP makes this easier. Without it, you may need to forward ports manually.

## Installation

1. Download `PalworldServerAdmin-Setup.exe` from the Files tab.
2. Run it. It installs to your user profile.
3. Launch it from the Start Menu or desktop shortcut.
4. A browser window opens automatically pointing at the admin panel.

To uninstall later, use the Start Menu uninstall shortcut or Windows' "Add or Remove Programs." Your server configs and downloaded mods are kept.

## First-Time Setup

1. On first launch, create the super admin account. This first account becomes the permanent super admin for this machine.
2. From Super Admin, deploy a fresh server or import an existing one.
3. Once a server is active, head to Mods to install UE4SS and start managing mods.
4. To browse Nexus Mods, connect your Nexus API key from Super Admin -> Nexus Mods Integration.
5. To let friends help administer, go to Settings -> Users & Access -> New Invite, then send them the code and your admin panel address.

## Known Limitations

- No confirmed graceful "save and shut down" yet. Use the in-app Save World action before stopping if you want a guaranteed save.
- Whisper and teleport are not real server actions. Palworld RCON does not provide per-player whisper or teleport commands.
- This tool manages the UE4SS Mods folder (`Pal/Binaries/Win64/Mods`), not Palworld's separate built-in pak-mod system.
- Remote admin access is plain HTTP by default.
- The Palworld server CMD text is not mirrored into the browser. AutoPalExpress shows its own output and real activity events in Logs, while the Palworld server window stays visible separately.
- Windows only.

## Troubleshooting

**Friends get a connection timeout.** Check Windows Firewall, router port forwarding, and whether your public IP changed.

**Mod install button is greyed out / says Premium required.** Nexus Mods restricts automated file downloads through its API to Premium accounts. Free accounts can still browse and manually download files from Nexus, then install them through the tool after hash verification.

**A friend's invite code doesn't work.** Codes are single-use. Check Settings -> Users & Access and generate a fresh one if needed.

## Support

Report issues or ask questions in the Posts tab on this mod's Nexus page.

## Credits

Built with FastAPI, React, and a healthy amount of SteamCMD wrangling.

## Changelog

**v1.0.0**: Initial release: multi-server management, Nexus mod browsing/installing, UE4SS installer, real server process control, player management, world settings editor, activity logs, UPnP port forwarding, multi-user accounts with invites.
