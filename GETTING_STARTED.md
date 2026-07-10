# Getting Started With AutoPalExpress

This guide is for the person hosting the Palworld server. It walks through the normal first setup, the screenshots to capture, and the places new users most often get stuck.

Use these screenshot filenames when adding images to GitHub. The placeholders already point to `images/`, so you can replace the files later without editing this guide.

| Step | Screenshot file |
| --- | --- |
| Installer options | `images/getting-started-01-installer.png` |
| First launch and super admin setup | `images/getting-started-02-first-launch.png` |
| Dashboard overview | `images/getting-started-03-dashboard.png` |
| Server instance setup | `images/getting-started-04-server-instances.png` |
| Super Admin network settings | `images/getting-started-05-super-admin-network.png` |
| Launcher Options | `images/getting-started-06-launcher-options.png` |
| World Settings | `images/getting-started-07-world-settings.png` |
| Mods and Nexus Browse | `images/getting-started-08-mods.png` |
| Player roster | `images/getting-started-09-player-roster.png` |
| Diagnostics report | `images/getting-started-10-diagnostics.png` |

## Before You Start

You need:

- A Windows 10 or Windows 11 PC that will host the server.
- Enough disk space for the Palworld Dedicated Server, saves, backups, and mods.
- Access to your router if friends will connect from outside your home.
- A real public IP from your ISP if you want normal internet hosting. If your ISP uses CGNAT, direct port forwarding may not work.
- Optional: a Nexus Mods Premium API key if you want direct Nexus installs from inside AutoPalExpress.

> [!TIP]
> You do not need a Steam account just to download the Palworld Dedicated Server. AutoPalExpress uses SteamCMD anonymously for the dedicated server files.

## 1. Install AutoPalExpress

Download `PalworldServerAdmin-Setup.exe` from the GitHub release page and run it.

During install, you can enable Windows startup recovery. This lets AutoPalExpress start when Windows starts and can bring the active server back online after a power loss, Windows update, or machine restart.

![Installer options](images/getting-started-01-installer.png)

> [!NOTE]
> If you run the installer again later, AutoPalExpress treats it as an update or repair when existing app data is found. Your server list, admin account, and saved settings are preserved.

## 2. Create The Super Admin

On a fresh install, the first account becomes the super admin. This account owns machine-level actions like server folders, game ports, Local API settings, firewall tools, verified mod uploads, and Launcher Options.

![First launch and super admin setup](images/getting-started-02-first-launch.png)

Use a password you will not share publicly. You can invite trusted friends as regular admins later.

## 3. Create Or Import A Server

AutoPalExpress can either deploy a fresh Palworld Dedicated Server or import one you already have.

For a fresh server, choose a server name and install location. The default location is inside AutoPalExpress app data, but you can choose another drive or folder if you want more space.

For an existing server, choose the folder that contains the Palworld dedicated server files.

![Server instance setup](images/getting-started-04-server-instances.png)

> [!TIP]
> If you accidentally import the same server again, AutoPalExpress deduplicates by folder so you do not end up managing the same install twice.

## 4. Start The Server

Open **Server Control** and start the active server. Then return to **Dashboard**.

The Dashboard should show the server online, basic CPU/RAM usage, uptime, installed mods, player count, and the player roster.

![Dashboard overview](images/getting-started-03-dashboard.png)

> [!NOTE]
> CPU and RAM are read from the real Palworld server processes for the selected server folder.

## 5. Set The Game Port

Open **Super Admin** and check the game port. This is the one place AutoPalExpress lets you edit the active server's game port.

If you change the port, save it there and restart the server. AutoPalExpress remembers the custom port across updates and enforces it into the live Palworld settings when the server starts.

![Super Admin network settings](images/getting-started-05-super-admin-network.png)

For normal Palworld connections, forward the game port as UDP to the host PC. Do not port-forward Palworld's Local REST API port.

> [!WARNING]
> Only expose the AutoPalExpress admin panel to trusted people. The panel uses plain HTTP by default so setup stays simple.

## 6. Use Launcher Options For Community Listing

Open **Launcher Options** as the super admin.

These options apply the next time the server starts:

- `-publiclobby` shows the server in Palworld's Community Server list.
- `-publicip` advertises the public IP detected in Super Admin.
- `-publicport` advertises the game port from Super Admin.
- `-useperfthreads`, `-NoAsyncLoadingThread`, and `-UseMultithreadForDS` enable Palworld's dedicated-server performance flags.

![Launcher Options](images/getting-started-06-launcher-options.png)

The public IP and public port values are read-only here on purpose. Super Admin remains the single place that owns network values.

> [!TIP]
> If direct connect works but the server does not appear in Community Servers, enable `-publiclobby` first. If it still does not appear, try the `-publicip` and `-publicport` overrides, then restart the server and give Palworld's list time to refresh.

## 7. Configure World Settings

Open **World Settings** to edit the active server's `PalWorldSettings.ini` from the browser.

Settings are grouped by topic. Dropdowns are used for known category fields, toggles are used for on/off values, and numeric tooltips include example low/default/high values where useful.

![World Settings](images/getting-started-07-world-settings.png)

Most world setting changes should be saved while the server is stopped or followed by a restart so Palworld reloads them cleanly.

## 8. Install Mods

Open **Mods** to manage UE4SS and installed mods.

AutoPalExpress can browse Nexus Mods metadata without a personal API key. Direct Nexus installs require the super admin to save a Nexus Premium API key. If you do not use direct install, download the mod from Nexus and use **Install From File** in Super Admin.

![Mods and Nexus Browse](images/getting-started-08-mods.png)

AutoPalExpress verifies manual Nexus files against Nexus' catalog when possible, then installs them into the managed mod folder.

## 9. Invite Trusted Admins

Open **Settings** as the super admin to create invites for trusted helpers.

Regular admins can handle daily tasks like Dashboard, Mods, Server Control, World Settings, and Logs. Super Admin-only pages stay locked away because they can affect the host machine, file system, ports, or startup behavior.

## 10. Check Players

Dashboard shows the player roster when Palworld's Local REST API is ready and the server has an admin password configured.

![Player roster](images/getting-started-09-player-roster.png)

If players are visible in the Palworld server window but not in AutoPalExpress, restart the server through AutoPalExpress so it can verify REST settings and fill an empty `AdminPassword` when needed.

## 11. Run Diagnostics When Something Fails

If a user cannot tell whether the problem is the port, firewall, REST API, or server folder, run **Diagnose AutoPalExpress** from the Start Menu.

The diagnostic command checks the active server, Palworld files, local listeners, game and REST ports, REST authentication, and Windows Firewall. It writes a report under:

```text
%LOCALAPPDATA%\PalworldServerAdmin\diagnostics
```

![Diagnostics report](images/getting-started-10-diagnostics.png)

Send that report when asking for support. It is much easier to diagnose than screenshots alone.

## Common Checks

If friends cannot connect:

- Confirm the server is online in Dashboard.
- Confirm the game port in Super Admin.
- Forward that game port as UDP to the host PC.
- Confirm Windows Firewall allows the Palworld server on that port.
- Confirm your ISP gives you a real public IP, not CGNAT.
- Run Diagnose AutoPalExpress and read the summary.

If the server does not show in Community Servers:

- Confirm direct connect works first.
- Enable `-publiclobby` in Launcher Options.
- If needed, enable `-publicip` and `-publicport`.
- Restart the server after changing launcher options.
- Wait for Palworld's public list to refresh.

If mods do not load:

- Install or repair UE4SS from the Mods page.
- Confirm the mod is enabled.
- Confirm the mod supports your Palworld version.
- Restart the server after changing mods.

If the roster is empty:

- Make sure the server was started through AutoPalExpress.
- Make sure Local API is enabled in Super Admin.
- Make sure `AdminPassword` is not blank.
- Restart the server once so AutoPalExpress can self-heal missing REST credentials.

## Screenshot Checklist

When preparing the GitHub version, capture these screens and save them with the exact filenames below:

- `images/getting-started-01-installer.png`
- `images/getting-started-02-first-launch.png`
- `images/getting-started-03-dashboard.png`
- `images/getting-started-04-server-instances.png`
- `images/getting-started-05-super-admin-network.png`
- `images/getting-started-06-launcher-options.png`
- `images/getting-started-07-world-settings.png`
- `images/getting-started-08-mods.png`
- `images/getting-started-09-player-roster.png`
- `images/getting-started-10-diagnostics.png`

After those files exist, GitHub will render the guide with screenshots automatically.
