[size=6][b]AutoPalExpress[/b][/size]

A desktop admin panel for running your own Palworld Dedicated Server(s): deploy a fresh server in a few clicks, manage mods and UE4SS without touching config files, and let friends log in with their own account to help run the server. No command line required.

[img]https://raw.githubusercontent.com/Kvitekvist/AutoPalExpress/refs/heads/main/images/home.png[/img]

[size=5][b]What This Is[/b][/size]

If you've ever hosted a modded Palworld server, you know the drill: hunting down UE4SS, manually unzipping mods into the right folder, editing PalWorldSettings.ini by hand, fighting with port forwarding, and hoping your friends don't need admin passwords sent to them. This tool wraps those jobs in one desktop app.

It's not a mod for the game itself. It's a standalone Windows application that manages your dedicated server from the outside.

[line]

[size=5][b]Features[/b][/size]

[size=4][b]Server Management[/b][/size]
[list]
[*]Deploy a brand-new, isolated Palworld Dedicated Server with a few clicks. The tool runs SteamCMD for you.[/*]
[*]Or import a server you already have installed.[/*]
[*]Run multiple servers side by side, each with its own folder, mods, and ports.[/*]
[*]Real start/stop/restart/save actions that manage the actual server process.[/*]
[*]Optional Windows startup recovery can open the tool at sign-in and bring the active server back after Windows updates or power loss.[/*]
[*]Re-running the installer works as an update/repair when existing AutoPalExpress data is present, so you keep your server list and admin account instead of re-entering first-time setup.[/*]
[/list]

[size=4][b]Mods[/b][/size]
[list]
[*]Browse Palworld mods from Nexus Mods without entering a personal API key.[/*]
[*]Install directly from Nexus when the super admin connects a Nexus API key with Premium download access.[/*]
[*]Let regular admins add browsed mods to a per-server wishlist; only the super admin can approve a request and initiate the download.[/*]
[*]Or download files on Nexus, then install them through the tool after it verifies the exact file hash against Nexus's catalog.[/*]
[*]Enable, disable, reorder, and remove mods without digging through folders.[/*]
[*]Installs go into the correct UE4SS Mods folder automatically.[/*]
[/list]

[size=4][b]UE4SS[/b][/size]
[list]
[*]One-click install/update/uninstall of UE4SS from the Mods page, pulled from its official GitHub releases.[/*]
[*]Installing or removing UE4SS leaves your installed mods alone.[/*]
[/list]

[size=4][b]Players, Settings, and Logs[/b][/size]
[list]
[*]See the live player roster through Palworld's REST API, including kick and ban actions.[/*]
[*]Edit Palworld world settings from the browser instead of hand-editing PalWorldSettings.ini.[/*]
[*]View AutoPalExpress output and server activity side by side in the Logs page. Palworld's own server window remains visible separately because the game does not expose that window text as a normal log stream.[/*]
[/list]

[size=4][b]Sharing With Friends[/b][/size]
[list]
[*]Automatic port forwarding for your game port via UPnP, if your router supports it.[/*]
[*]Shows your public IP so you can send it to friends.[/*]
[*]Multi-user accounts: you are the super admin; friends join through invite codes as regular admins.[/*]
[*]Optional remote access to the admin panel itself, including one-click Windows Firewall permission prompts.[/*]
[/list]

[line]

[size=5][b]Getting Started[/b][/size]

This is the same walkthrough as the project's Getting Started guide on GitHub. You do not need to understand SteamCMD, config files, or Windows Firewall to start.

[quote][b]What You Need:[/b] a Windows 10 or 11 PC, enough disk space for the server and backups, your router login if friends will join over the internet, and a real public IP from your internet provider.[/quote]

[quote][b]Tip:[/b] You do not need a Steam account to download the Palworld Dedicated Server. AutoPalExpress can download it for you.[/quote]

[size=4][b]1. Install The App[/b][/size]

Download AutoPalExpress-Setup.exe from the Files tab and run it.

[img]https://raw.githubusercontent.com/Kvitekvist/AutoPalExpress/refs/heads/main/images/getting-started-01-installer-start.png[/img]

If you want the server to come back after a PC restart, turn on the Windows startup option during install.

[img]https://raw.githubusercontent.com/Kvitekvist/AutoPalExpress/refs/heads/main/images/getting-started-02-installer-startup.png[/img]

Choose where to install the app.

[img]https://raw.githubusercontent.com/Kvitekvist/AutoPalExpress/refs/heads/main/images/getting-started-01-installer-location.png[/img]

[quote][b]Note:[/b] Running the installer again later updates the app. It keeps your server list and admin account. The installer also offers a straight Uninstall option if you ever want to remove AutoPalExpress - it keeps your Palworld server files, mods, and backups, and only resets the admin account and app settings.[/quote]

[size=4][b]2. Make Your Admin Account[/b][/size]

The first account is the main admin account. It can change important things like ports, server folders, mods, and startup options.

[img]https://raw.githubusercontent.com/Kvitekvist/AutoPalExpress/refs/heads/main/images/getting-started-03-admin-account.png[/img]

Use a password you do not share in public.

[size=4][b]3. Add A Server[/b][/size]

You have two choices:
[list]
[*][b]Create new server[/b] if you are starting fresh.[/*]
[*][b]Import existing server[/b] if you already have Palworld server files.[/*]
[/list]

[img]https://raw.githubusercontent.com/Kvitekvist/AutoPalExpress/refs/heads/main/images/getting-started-04-server-choice.png[/img]

[quote][b]Tip:[/b] You can put the server on another drive if your C drive is small.[/quote]

[size=4][b]4. Start The Server[/b][/size]

Go to Server Control and click Start Server.

[img]https://raw.githubusercontent.com/Kvitekvist/AutoPalExpress/refs/heads/main/images/getting-started-06-start-server.png[/img]

Then go to Dashboard. If everything worked, it should show Online.

[img]https://raw.githubusercontent.com/Kvitekvist/AutoPalExpress/refs/heads/main/images/getting-started-07-dashboard-online.png[/img]

[size=4][b]5. Let Friends Join[/b][/size]

Go to Super Admin and check the Game Port.

[img]https://raw.githubusercontent.com/Kvitekvist/AutoPalExpress/refs/heads/main/images/getting-started-08-game-port.png[/img]

Most Palworld servers use port 8211, but yours may be different. In your router, forward that port as UDP to the PC running AutoPalExpress.

[img]https://raw.githubusercontent.com/Kvitekvist/AutoPalExpress/refs/heads/main/images/getting-started-09-router-port-forward.png[/img]

Then give friends your public IP and port, for example:

[code]123.123.123.123:8213[/code]

[quote][b]Warning:[/b] Do not forward the Palworld Local API / REST API port. AutoPalExpress uses that only on your own PC.[/quote]

[size=4][b]6. Show The Server In Community Servers[/b][/size]

Go to Launcher Options and turn on -publiclobby.

[img]https://raw.githubusercontent.com/Kvitekvist/AutoPalExpress/refs/heads/main/images/getting-started-10-launcher-options.png[/img]

Restart the server after changing launcher options. If direct connect works but the Community Server list does not, also try -publicip and -publicport - those values come from Super Admin, so you do not type them on this page.

[size=4][b]7. Change World Settings[/b][/size]

Go to World Settings. This is where you change things like:
[list]
[*]Server name[/*]
[*]Passwords[/*]
[*]Max players[/*]
[*]XP rate[/*]
[*]Day and night speed[/*]
[*]Pal spawn rate[/*]
[*]Death penalty[/*]
[/list]

[img]https://raw.githubusercontent.com/Kvitekvist/AutoPalExpress/refs/heads/main/images/getting-started-11-world-settings.png[/img]

Click Save Changes when you are done, then restart the server so Palworld reloads the settings.

[size=4][b]8. Add Mods[/b][/size]

Go to Mods to install UE4SS and manage mods.

[img]https://raw.githubusercontent.com/Kvitekvist/AutoPalExpress/refs/heads/main/images/getting-started-12-mods.png[/img]

For Nexus Mods: you can browse mods without an API key, regular admins can add mods to a server wishlist, and only the super admin can approve a request or start a direct install using the saved Nexus Premium API key. You can also download a mod yourself and install it from file in Super Admin. Restart the server after changing mods.

[size=4][b]9. Invite Friends To Help[/b][/size]

Go to Settings and create an invite code.

[img]https://raw.githubusercontent.com/Kvitekvist/AutoPalExpress/refs/heads/main/images/getting-started-13-invite-users.png[/img]

Only invite people you trust. Regular admins can help with normal server work; the main admin still controls the more dangerous settings.

[size=4][b]10. If Something Does Not Work[/b][/size]

Use Diagnose AutoPalExpress from the Windows Start Menu.

[img]https://raw.githubusercontent.com/Kvitekvist/AutoPalExpress/refs/heads/main/images/getting-started-14-diagnostics.png[/img]

It checks your server folder, game port, Local API, Windows Firewall, and whether Palworld is listening, then saves a report here:

[code]Documents\AutoPalExpress\diagnostics[/code]

Send that report when asking for help in the Posts tab.

[line]

[size=5][b]Quick Fixes[/b][/size]

[b]Friends cannot join[/b]
[list]
[*]Make sure Dashboard says Online.[/*]
[*]Check the game port in Super Admin.[/*]
[*]Forward the game port as UDP in your router.[/*]
[*]Run Diagnose AutoPalExpress.[/*]
[*]Ask your internet provider if you are behind CGNAT.[/*]
[/list]

[b]Server is not in Community Servers[/b]
[list]
[*]First test direct connect.[/*]
[*]Turn on -publiclobby.[/*]
[*]Restart the server.[/*]
[*]Try -publicip and -publicport.[/*]
[*]Wait a bit. Palworld's list can be slow.[/*]
[/list]

[b]Players are missing from the roster[/b]
[list]
[*]Start the server from AutoPalExpress.[/*]
[*]Make sure Local API is enabled in Super Admin.[/*]
[*]Restart the server once.[/*]
[/list]

[b]Mods do not load[/b]
[list]
[*]Install or repair UE4SS.[/*]
[*]Make sure the mod is enabled.[/*]
[*]Make sure the mod works with your Palworld version.[/*]
[*]Restart the server.[/*]
[/list]

[line]

[size=5][b]Security / Remote Access[/b][/size]

This is built for private servers and trusted friend groups. The admin panel uses regular HTTP by default so the installer can stay truly one-click with no domain or certificate setup. If you port-forward the admin panel, only invite people you trust, don't post invite codes publicly, and remember that login details are not encrypted over the network.

For stronger remote access, use a private network tool like Tailscale or put the panel behind a reverse proxy with real HTTPS.

Do not port-forward Palworld's REST API port directly. AutoPalExpress talks to it locally on the server PC; friends should use the AutoPalExpress panel, not the raw Palworld REST API.

The installer is not code-signed yet, so Windows SmartScreen may warn on first run. That's expected for an unsigned community tool; verify the file came from the official download page before installing.

[line]

[size=5][b]Requirements[/b][/size]

[list]
[*]Windows 10 or 11, 64-bit.[/*]
[*]A Steam account is not required: the dedicated server downloads anonymously via SteamCMD.[/*]
[*]A Nexus Mods account is only needed when you download files from Nexus itself. Browsing inside the tool does not require an API key.[/*]
[*]Direct installs and approved wishlist requests require Nexus Premium download access through the saved super-admin API key. Regular admins cannot invoke that key themselves.[/*]
[*]If you plan to let friends connect from outside your home network: a router that supports UPnP makes this easier. Without it, you may need to forward ports manually.[/*]
[/list]

[line]

[size=5][b]Known Limitations[/b][/size]

[list]
[*]Whisper and teleport are not real server actions. Palworld's REST API does not provide per-player whisper or teleport commands.[/*]
[*]This tool manages the UE4SS Mods folder (Pal/Binaries/Win64/Mods), not Palworld's separate built-in pak-mod system.[/*]
[*]Remote admin access is plain HTTP by default.[/*]
[*]The Palworld server CMD text is not mirrored into the browser. AutoPalExpress shows its own output and real activity events in Logs, while the Palworld server window stays visible separately.[/*]
[*]Windows only.[/*]
[/list]

[line]

[size=5][b]Support[/b][/size]

Report issues or ask questions in the Posts tab on this mod's Nexus page.

[size=5][b]Credits[/b][/size]

Built with FastAPI, React, and a healthy amount of SteamCMD wrangling.

[line]

[size=5][b]Changelog[/b][/size]

[b]v1.0.0[/b]: Initial release: multi-server management, Nexus mod browsing with direct Premium installs and verified manual installs, UE4SS installer, real server process control, Windows startup recovery, update/repair-aware installer, player management, world settings editor, activity logs, UPnP port forwarding, multi-user accounts with invites.

[b]v1.0.1[/b]: Installer now offers an explicit Install / Update / Uninstall choice and correctly resets the admin account on a real uninstall. World Settings covers many more Palworld server options with grouped sections and tooltips.
