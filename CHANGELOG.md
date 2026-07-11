# Changelog

## 1.0.3 - 2026-07-10

- Installer checksum (SHA256): `57404DC5DAE6FA3BEDF9E5B5D8584AC1AAA94B01DFDF1A8506A44F0E1DAE7322`.
- **TICKET-0078**: Added an Enable/Disable toggle for Steam Query Port in Launcher Options. It is now disabled by default for existing and new servers, so AutoPalExpress only adds `-queryport=<port>` when the super admin explicitly enables it. Super Admin firewall/port-forward query-port steps now appear only while that option is enabled.
- **TICKET-0076**: Fixed the in-app Super Admin diagnostics button so a blocked/declined Windows permission prompt no longer leaves users with no report. AutoPalExpress now falls back to a limited non-admin diagnostics run, shows the report inline, and marks it clearly when firewall inspection may be incomplete.
- **TICKET-0075**: Fixed Steam query port collisions making Palworld start on the next open game port. AutoPalExpress now keeps `-queryport` separate from `-port`, migrates old same-port values to a safe nearby port, blocks saving a query port that matches any registered server game port, and shows the query port clearly in the Super Admin firewall/port-forward checklist.
- **TICKET-0074**: Added a "Run Diagnostics" button to Super Admin that runs the existing diagnostics tool (firewall, port forwarding, REST API, server files, etc.) from inside the app and shows the report right there, instead of needing to find the separate Start Menu shortcut. A real Windows permission prompt still appears and needs to be approved, same as other admin-level actions in the app.
- **TICKET-0073**: Made the Sidebar's "Host Controls" section (added in TICKET-0070) into a solid gold badge instead of a thin divider line, since it was too subtle for some users to notice. Also moved the Steam query port editor (TICKET-0069) from Super Admin into Launcher Options, next to the other launch arguments where it fits more naturally - Super Admin now shows it read-only for reference during port forwarding.
- **A note on the new translations:** every non-English language in this release (Chinese Simplified, Japanese, German, French, Spanish) was translated by AI (Claude), not a human translator or native speaker. We have no reliable way to validate the quality of these translations ourselves. If you spot something that reads wrong, awkward, or mistranslated in your language, please open an issue or leave a comment - we genuinely appreciate the feedback and will fix it.
- **TICKET-0069**: Added a Steam query port option, answering a user's question about whether AutoPalExpress could designate a separate Steam server-list/query-protocol port (`-queryport=`) from the game port. Each server instance now has its own query port, editable in Super Admin/Launcher Options follow-up UI, and covered by the same firewall/UPnP forwarding flow as the game port.
- **TICKET-0071**: Fixed Super Admin's Local API panel so the "REST API Enabled" toggle shows its field name as a title above the box with "Enable"/"Disable" text inside, matching how World Settings' toggles already look.
- **TICKET-0070**: Super Admin's exclusive Sidebar items (Launcher Options, Settings, Super Admin) now show a small gold crown badge and sit under a "Host Controls" divider, so it's visually obvious which pages only the super admin can see.
- **TICKET-0068**: The entire app is now translated in all 6 supported languages - Dashboard (including the player roster and kick/ban/whisper dialogs), Mods (including Nexus browsing/install dialogs and the UE4SS panel), Server Control, Launcher Options, Logs, Settings (startup recovery, users & invites, server instances, automation/backups, deploy/import wizards), and Super Admin (Local API, port forwarding, remote access, Nexus integration). Only World Settings and the TopBar/Sidebar chrome were done before this (TICKET-0066/TICKET-0067) - this covers everything else.
- **TICKET-0067**: World Settings is now fully translated in all 6 supported languages - every field's label, help text, description, and dropdown options (not just the Sidebar/TopBar chrome from TICKET-0066). The actual `PalWorldSettings.ini` file and everything sent to the backend still always use Palworld's exact English values (e.g. `Difficulty=Hard`) - only what's displayed on screen changes with the selected language.
- **TICKET-0066**: Added multi-language support (i18n). A new language dropdown in the top bar (flag + native name) lets each logged-in user pick their own language, persisted server-side per account so it follows them across sessions/devices. v1 ships English, Chinese (Simplified), Japanese, German, French, and Spanish, translating the Sidebar nav and TopBar page titles/subtitles as the initial proof-of-pipeline surface; more strings/pages can be added incrementally by extending the same translation files.

## 1.0.2 - 2026-07-10

- Installer checksum (SHA256): `50f9f4615efc6fa34239169fbde1f08cb8e02041df7354e4e8b0abbb34c5794b`.
- **TICKET-0064**: Rewrote `NEXUS_DESCRIPTION.md`'s setup instructions to match `GETTING_STARTED.md`'s full numbered walkthrough (screenshots, tips, warnings, quick fixes), converted to Nexus BBCode with placeholder image URLs ready to swap in after uploading screenshots to Nexus's gallery.
- **TICKET-0063**: Fixed a bug found right after shipping TICKET-0062: uninstalling then reinstalling AutoPalExpress never asked to create a new admin account, because the admin account file lived in the same app-data folder deliberately kept for real Palworld server references. Uninstalling now clears the saved admin account and app settings (via the compiled uninstaller itself, so this covers every uninstall path) while still keeping server registrations, mods, and backups untouched.
- **TICKET-0062**: The installer now opens with an Install / Update / Uninstall choice right after the Welcome page, so `PalworldServerAdmin-Setup.exe` can drive uninstall directly instead of requiring the separate uninstaller shortcut. Choosing Uninstall confirms, runs the real uninstaller, and exits without continuing into the install wizard.
- **TICKET-0061**: Updated World Settings for a Palworld config update that added dozens of new server settings (guild management, voice chat range, PvP damage/kill-drop config, stat-point-allocation locks, respawn penalty tuning, and more), verified against the live installed server's config file. Fixed `bHardcore`'s description, which had gone stale now that Pal permadeath is its own separate setting (`bPalLost`). `PublicIP` is now hidden from the generic editor, matching `PublicPort`, since Launcher Options already owns the public IP override.
- **TICKET-0060**: Rebuilt the executable and installer so the installed app includes the corrected World Settings toggle header/text layout.
- **TICKET-0059**: Added the available Getting Started screenshot files to git so GitHub can render them, and recorded the remaining missing image placeholders.
- **TICKET-0058**: Updated World Settings toggle boxes so the setting name stays as the field header and the box text reads `Enable` or `Disable`.
- **TICKET-0057**: Rewrote the Getting Started guide in simpler beginner-friendly language with more screenshot placeholders.
- **TICKET-0056**: Fixed World Settings group headers and toggle alignment so boolean controls line up with numeric/dropdown fields without long divider lines after category labels.
- **TICKET-0055**: Added a GitHub-ready Getting Started guide with step-by-step setup guidance and screenshot placeholders under `images/`.
- **TICKET-0054**: Refined World Settings with concrete numeric examples, compact aligned toggles, clearer alternating category bands, and moved Local API settings to Super Admin.
- **TICKET-0053**: Improved World Settings with grouped sections, tooltips, and dropdown controls for known Palworld categorical settings.
- **TICKET-0052**: Added a bundled diagnostics command that produces a support report for active server setup, local ports, firewall, REST API, and likely router/ISP issues.
- **TICKET-0050**: Fixed port enforcement so it edits the live `PalWorldSettings.ini` in place and preserves unrelated world settings.
- Also includes GETTING_STARTED.md screenshot/content updates made directly on GitHub between releases.

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
