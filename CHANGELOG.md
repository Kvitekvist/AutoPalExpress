# Changelog

## Current build vs. origin/main - 2026-07-09

- **TICKET-0064**: Rewrote `NEXUS_DESCRIPTION.md`'s setup instructions to match `GETTING_STARTED.md`'s full numbered walkthrough (screenshots, tips, warnings, quick fixes), converted to Nexus BBCode with placeholder image URLs ready to swap in after uploading screenshots to Nexus's gallery.
- **TICKET-0063**: Fixed a bug found right after shipping TICKET-0062: uninstalling then reinstalling AutoPalExpress never asked to create a new admin account, because the admin account file lived in the same app-data folder deliberately kept for real Palworld server references. Uninstalling now clears the saved admin account and app settings (via the compiled uninstaller itself, so this covers every uninstall path) while still keeping server registrations, mods, and backups untouched.
- **TICKET-0062**: The installer now opens with an Install / Update / Uninstall choice right after the Welcome page, so `PalworldServerAdmin-Setup.exe` can drive uninstall directly instead of requiring the separate uninstaller shortcut. Choosing Uninstall confirms, runs the real uninstaller, and exits without continuing into the install wizard.
- **TICKET-0061**: Updated World Settings for a Palworld config update that added dozens of new server settings (guild management, voice chat range, PvP damage/kill-drop config, stat-point-allocation locks, respawn penalty tuning, and more), verified against the live installed server's config file. Fixed `bHardcore`'s description, which had gone stale now that Pal permadeath is its own separate setting (`bPalLost`). `PublicIP` is now hidden from the generic editor, matching `PublicPort`, since Launcher Options already owns the public IP override.
- **TICKET-0060**: Rebuilt the executable and installer so the installed app includes the corrected World Settings toggle header/text layout. New installer checksum is `6636805A7374892F3A9EE146CCF08C7461C3FE129BC396FB0C8F83933600B9DF`.
- **TICKET-0059**: Added the available Getting Started screenshot files to git so GitHub can render them, and recorded the remaining missing image placeholders.
- **TICKET-0058**: Updated World Settings toggle boxes so the setting name stays as the field header and the box text reads `Enable` or `Disable`.
- **TICKET-0057**: Rewrote the Getting Started guide in simpler beginner-friendly language with more screenshot placeholders.
- **TICKET-0056**: Fixed World Settings group headers and toggle alignment so boolean controls line up with numeric/dropdown fields without long divider lines after category labels.
- **TICKET-0055**: Added a GitHub-ready Getting Started guide with step-by-step setup guidance and screenshot placeholders under `images/`.
- **TICKET-0054**: Refined World Settings with concrete numeric examples, compact aligned toggles, clearer alternating category bands, and moved Local API settings to Super Admin.
- **TICKET-0053**: Improved World Settings with grouped sections, tooltips, and dropdown controls for known Palworld categorical settings.
- **TICKET-0052**: Added a bundled diagnostics command that produces a support report for active server setup, local ports, firewall, REST API, and likely router/ISP issues.
- **TICKET-0050**: Fixed port enforcement so it edits the live `PalWorldSettings.ini` in place and preserves unrelated world settings.
- **TICKET-0041**: Fixed Launcher Options visibility/naming, restored visible Nexus Direct Install requirements, tightened instance dedupe, and renamed Browse Files.
- **TICKET-0042**: Rebuilt the installer so the packaged app actually includes Launcher Options.
- **TICKET-0043**: Added Server Control update checks and confirmed SteamCMD update jobs.
- **TICKET-0044**: Added Super Admin-only `-publicip` and `-publicport` launcher overrides sourced from existing network/game-port settings.
- **TICKET-0045**: Fixed Launcher Options showing stale default `8211` for `-publicport`.
- **TICKET-0046**: Preserved custom Super Admin game ports across reinstall/update and enforced them into the live ini on launch.
- **TICKET-0047**: Fixed Dashboard roster detection after the REST migration by falling back to the stored REST port and normalizing Palworld player fields.
- **TICKET-0048**: Fixed REST Unauthorized failures caused by blank `AdminPassword`; AutoPalExpress now generates one only when missing or empty.

## 1.0.0 - 2026-07-07

- Fixed REST Unauthorized failures caused by blank `AdminPassword`: starting a server through AutoPalExpress now creates one only when missing or empty.
- Fixed Dashboard roster detection after the REST migration by trying the stored REST management port when the ini check is incomplete and normalizing Palworld player fields before displaying them.
- Fixed reinstall/update port drift: a remembered Super Admin game port now wins over Palworld's default and is used by Launcher Options.
- Fixed Launcher Options `-publicport` showing the original default port instead of the live Super Admin game port.
- Added Super Admin-only Launcher Options toggles for `-publicip` and `-publicport`; their values are shown read-only and come from the existing public address/game-port flow.
- Added Server Control update checks: AutoPalExpress compares the installed Palworld Dedicated Server build with Steam's public build and asks before running a SteamCMD update.
- Rebuilt the Windows installer so the packaged app includes the Launcher Options sidebar item and updated the release checksum.
- Renamed Launcher Flags to Launcher Options and split the combined performance toggle into individual `-useperfthreads`, `-NoAsyncLoadingThread`, `-UseMultithreadForDS`, and `-publiclobby` toggles.
- Nexus Browse now always shows the Direct Install action to super admins and explains when a saved Premium Nexus key is required, instead of hiding the option.
- Tightened server-instance dedupe by canonicalizing server paths and relabeled the per-instance folder action as Browse Files.
- Installer update/repair runs now preserve existing setup and skip the first-time server/account questions when AutoPalExpress data already exists.
- Fixed duplicate server-instance rows caused by re-importing or reinstalling the same server folder.
- Added Settings actions to switch servers, open a server folder in Explorer, unregister a server, or unregister and delete its server files.
- Restored direct Nexus installs for super admins with a saved Premium API key.
- Added Windows startup recovery: AutoPalExpress can start at Windows sign-in and restart the active server after the machine reboots.
- Added a dedicated Launcher Flags sidebar page for Community Server visibility, performance flags, worker thread override, and JSON log format.
- Fixed World Settings hiding the Launch Options panel even though the active server's settings loaded.
- Moved safe per-server Palworld launch-option controls from Settings into World Settings.
- Added World Settings controls for safe per-server Palworld launch options: performance flags, worker thread override, and JSON log format.
- Added a Settings checkbox to show a server in Palworld's Community Server list on next start.

- Added a custom install-location picker for new Palworld server deployments, including the optional first server created during setup.
- Fixed Nexus Browse cards opening the wrong Nexus URL path.
- Clarified the Nexus Browse install flow so cards no longer look like one-click installs; super admins now get an Install File shortcut to the verified upload area.
- Fixed Dashboard CPU/RAM reporting so status samples the real Palworld worker process in the selected server folder, even when the launcher tree is incomplete or the backend restarted.
- Dashboard tick-rate timing now shows as unavailable when Palworld's REST metrics payload does not provide frame time, instead of displaying a misleading `0 ms`.
- Replaced Palworld RCON usage with Palworld's official local REST API for player list, kick/ban/unban, announcements, saves, metrics, backups, and shutdown paths.
- Switched Nexus Mods browsing to public GraphQL metadata, so browsing no longer requires a personal API key.
- Switched verified manual mod uploads to Nexus GraphQL file-hash lookup.
- Paused one-click Nexus downloads until AutoPalExpress follows Nexus Mods' registered app/OAuth process.
- Removed the Nexus API-key prompt from the installer and updated public release docs.
