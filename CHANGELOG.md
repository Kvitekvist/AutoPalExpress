# Changelog

## 1.0.0 - 2026-07-07

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
