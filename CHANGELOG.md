# Changelog

## 1.0.0 - 2026-07-07

- Fixed Dashboard CPU/RAM reporting so status samples the real Palworld worker process in the selected server folder, even when the launcher tree is incomplete or the backend restarted.
- Dashboard tick-rate timing now shows as unavailable when Palworld's REST metrics payload does not provide frame time, instead of displaying a misleading `0 ms`.
- Replaced Palworld RCON usage with Palworld's official local REST API for player list, kick/ban/unban, announcements, saves, metrics, backups, and shutdown paths.
- Switched Nexus Mods browsing to public GraphQL metadata, so browsing no longer requires a personal API key.
- Switched verified manual mod uploads to Nexus GraphQL file-hash lookup.
- Paused one-click Nexus downloads until AutoPalExpress follows Nexus Mods' registered app/OAuth process.
- Removed the Nexus API-key prompt from the installer and updated public release docs.
