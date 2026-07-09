# Project Memory

This file represents the long-term memory of the project.

Update continuously.

---

## Project Vision

A self-hosted Palworld Dedicated Server admin panel that lets a small group of friends jointly run a modded server without anyone needing SSH access, shared admin passwords, or manual config-file editing. The host is the permanent "super admin"; friends register via invite code as regular admins with full day-to-day operational access. Optimized for "a handful of friends running their own server," not a hosted multi-tenant SaaS.

---

## Current Milestone

Core feature set is complete and has been exercised live: multi-instance server management (deploy new via SteamCMD, or import existing), real process control, a generic World Settings (`.ini`) editor, Nexus GraphQL mod browsing with direct Premium API-key installs and hash-verified manual file installs, UE4SS installer, networking (UPnP port forwarding, Windows Firewall automation, public IP display), multi-user auth with invites, and Palworld REST API-backed scheduled backups/restarts, restart warnings, join/leave announcements, metrics, and Players page actions (list/kick/ban/unban). Currently in a polish/hardening phase rather than adding wholesale new feature areas.

---

## Active Priorities

* REST API has replaced RCON for game-level control; manual Stop/Restart now try Palworld's REST shutdown path before local process cleanup.
* `process_manager` now discovers Palworld server processes by executable name and selected server folder for status metrics, even if the backend forgot the original launcher process.
* Remaining mocked surfaces: the general Settings blob's own fields, plus per-player whisper/teleport on the Players page because Palworld's REST API has no matching commands.
* NEEDS MANUAL VERIFICATION (TICKET-0018): the new installer-driven first-run setup (custom wizard pages + progress page in `installer.iss`) compiles cleanly and every backend code path it depends on is tested via real HTTP requests, but the actual interactive GUI click-through hasn't been run through by a human yet - this dev sandbox has no interactive desktop session to drive an installer wizard with (confirmed: even a `/VERYSILENT` install hangs on an unrelated pre-existing privilege dialog). Next real install should be watched end-to-end.
* Real Palworld server console log content will likely never be capturable (TICKET-0019/0020/0023): confirmed the console is rendered via Dear ImGui (`ImGui.ini` found in the server's own config), a GPU overlay with no real text buffer to read - not just "hard to pipe," genuinely not text at all. The Logs page is now real, with AutoPalExpress output from `backend.log` beside this app's own server activity feed, but not Palworld's own engine-window text.

---

## Technical Debt

* No automated test suite anywhere in the project - all verification has been manual/live (see memory/tech_stack.md Notes).
* `process_manager`'s command/control tracking is still in-memory only, lost on every backend restart. Status metrics can rediscover matching Palworld processes by server folder, but Stop/Restart still rely on the tracked launcher plus REST cleanup path.
* No confirmed graceful shutdown path for the manual Stop/Restart actions.
* Git exists, but sandboxed Codex may hit "dubious ownership" because the sandbox user differs from the host owner. Check current git behavior before relying on git commands.

---

## Known Issues

* FIXED 2026-07-06 (TICKET-0006, see Decision Log-adjacent ticket_memory entry): Kicking a player completed without error but didn't disconnect them. Root cause found from the user's own server console log (`User id: steam_<SteamID64>`) - `KickPlayer`/`BanPlayer`/`UnBanPlayer` need that `steam_`-prefixed ID form, not the bare numeric ID `ShowPlayers` returns. Confirmed fixed against a real kick.
* A server started/already running before an admin-backend restart will show as "offline" in the tool afterward, even though it may be genuinely still running and REST-reachable - the tool's scheduler (restart/join-leave checks) goes silent for it until it's restarted through the tool.
* FIXED 2026-07-06 (see Decision Log, two entries): `process_manager.start()` was launching servers with the stale `gamePort` stored in `instances.json` instead of whatever was actually live in `PalWorldSettings.ini`. Went through two passes - first just made launch read the ini (matching what `network.py` already did for port-forwarding), then went further at the user's request: World Settings' "Game Port" field is now the one editable place for a server's port, and launch actively enforces + syncs it both ways (writes it into the ini if missing, writes the resolved value back into `instances.json`) instead of just resolving a read. Also fixed a latent bug this surfaced: `palworld_settings._get_field`/`_set_field` couldn't see a key that happened to be the very first field in `OptionSettings=(...)` (real Palworld files never hit this since `Difficulty` is always first, but the new self-heal path did).
* FIXED 2026-07-06 (see Decision Log): found while debugging a real live deployment where a client PC and a new dedicated server machine, both on the same home router, collided over the router's single external-port-8000 UPnP mapping - the client's earlier "Open Remote Access" click was still occupying it, silently redirecting the public IP back to the client. Neither `RemoteAccessPanel` nor `PortForwardPanel` could show/remove a mapping unless the current browser session had just created it (`forwarded` was local-only state). Both panels now ask the router directly what's mapped (`upnp.get_port_mapping`) and can remove any mapping regardless of which machine created it - this is also the general answer to "the router's own UI won't let me remove a UPnP entry."
* Palworld's REST API has no per-player whisper or teleport command, so those two Players-page actions remain frontend-mocked with no real backend equivalent possible without another API.
* The panel is plain HTTP - if port-forwarded for remote friend access, credentials/session cookies travel unencrypted. Mitigated partially by per-IP login rate limiting, but not eliminated (deliberate, informed trade-off - see Decision Log). In progress: user is setting up a DuckDNS domain + Nginx Proxy Manager reverse proxy for real Let's Encrypt HTTPS (see Decision Log's TLS history for why a self-signed cert/CA was reverted before).
* FIXED 2026-07-06 (TICKET-0008/0009/0010/0011, see Decision Log): full security audit found and fixed 4 issues - RCON password readable by any authenticated user (not just super admin), regular admins able to register arbitrary host folders as "instances" and trigger native dialogs, a login timing side-channel revealing valid usernames, and sessions never expiring server-side.
* OPEN, deferred from the same audit: `firewall.py`'s UAC-elevated `.bat` rule-name interpolation is a latent batch-injection risk (not currently exploitable - every caller passes validated int/enum today). `login_throttle.py`'s per-IP rate limiting will become a single shared bucket for all users once the in-progress reverse-proxy (Nginx Proxy Manager) setup is live, since every request will appear to come from the proxy's own IP - needs trusted-proxy `X-Forwarded-For` handling added as part of that migration.
* FIXED 2026-07-06 (TICKET-0013/0014, see Decision Log): second security audit pass, informed by reading Crafty Controller's source for inspiration. `spa_fallback` (serves the built frontend) had no path-containment check of its own - safe only by incidental Starlette URL normalization, confirmed by calling the function directly with a raw traversal string. Added an explicit check. Also closed a gap TICKET-0012 left open: `automation.router` was still reachable by any regular admin via direct API call even though its only UI entry point is now super-admin-only.
* FIXED 2026-07-08 (TICKET-0029): Nexus Browse cards generated the wrong public Nexus URL path and made the manual verified upload path look like a one-click install button. Cards now open `nexusmods.com/palworld/mods/<id>` and show a Super Admin install-file shortcut or a Super Admin-only notice.
* FIXED 2026-07-08 (TICKET-0030): Dashboard CPU/RAM could show 0% or low memory while Task Manager showed active Palworld usage because status only sampled the remembered launcher tree. Status now samples discovered `PalServer.exe`/`PalServer-Win64-Shipping-Cmd.exe` processes inside the selected server folder, and missing REST frame-time metrics render as unavailable instead of `0 ms`.
* FIXED 2026-07-08 (TICKET-0031): New server deployments now keep the AutoPalExpress data `servers` folder as the default, but the super admin can choose another parent folder. The installer first-server flow carries the same optional location into `first_run_seed.json`.
* FIXED 2026-07-08 (TICKET-0032): Settings now has a prominent per-server "Show in Community Server list" toggle. It persists on the instance record and adds Palworld's `-publiclobby` launch argument the next time that server starts.
* FIXED 2026-07-08 (TICKET-0033): Added safe per-server launch options for Palworld's performance flags, optional worker thread count, and JSON log format. Port, players, community listing, and public IP/port remain owned by their existing app flows rather than duplicated.
* FIXED 2026-07-08 (TICKET-0034): The safe launch options from TICKET-0033 now live on World Settings instead of the Settings server-instance cards. They still persist on the active instance and still require a restart to take effect.
* FIXED 2026-07-08 (TICKET-0035): World Settings now gets Launch Options in the same `/api/server-settings` payload as the `.ini` fields, so the panel cannot disappear because a separate active-instance request failed.
* FIXED 2026-07-08 (TICKET-0036): Launcher flags now have their own super-admin-only sidebar page. Community Server listing, performance flags, worker thread override, and JSON log format all live there, and no longer appear in Settings or World Settings.
* FIXED 2026-07-09 (TICKET-0037): Windows startup recovery can now start AutoPalExpress at sign-in and auto-start the active server when the app launches. The installer includes the same option and explains that it helps bring the server back after machine restarts.
* FIXED 2026-07-09 (TICKET-0038): Direct Nexus installs are restored for super admins with a saved Nexus Premium API key. The app still keeps public GraphQL browsing and verified manual file upload as fallback paths.
* FIXED 2026-07-09 (TICKET-0039): Server Instances now deduplicates records by normalized server folder, so reinstalling or re-importing the same Palworld server no longer shows repeated rows. Settings also has per-server actions to switch to it, open the folder in Explorer, unregister it without touching files, or unregister and delete the server folder after it is stopped.
* FIXED 2026-07-09 (TICKET-0040): The installer now treats existing `%LOCALAPPDATA%\PalworldServerAdmin\data` as update/repair mode. It skips first-time server/admin setup pages, removes stale `first_run_seed.json`, and preserves the existing server list and admin account.
* FIXED 2026-07-09 (TICKET-0041): Nexus Browse now keeps Direct Install visible for super admins and explains the saved Premium key requirement. Launcher Flags was renamed Launcher Options and now exposes separate toggles for `-useperfthreads`, `-NoAsyncLoadingThread`, `-UseMultithreadForDS`, and `-publiclobby`. Server-instance dedupe now canonicalizes stored paths, and the per-instance folder action is labeled Browse Files.
* FIXED 2026-07-09 (TICKET-0042): Rebuilt the Windows installer after verifying the current source and `web/dist` already contain Launcher Options. The new installer checksum is `DE47FB088842FA3135856407919601A759B642BFADF328CCED007B7E1EC2042B`.
* FIXED 2026-07-09 (TICKET-0043): Server Control can now check SteamCMD build ids for the active Palworld Dedicated Server, ask before updating when Steam has a newer public build, and run the stopped-server update as a pollable SteamCMD job. The rebuilt installer checksum is `3C1F74E39D9DC3DFF7BDD5532ACE2DA64A3C11E361036138E570DAEEBAA77F0E`.
* FIXED 2026-07-09 (TICKET-0044): Launcher Options now has super-admin-only toggles for Palworld's `-publicip` and `-publicport` community-listing overrides. The override values are displayed read-only and sourced from the existing Super Admin public-address/game-port flow, so IP and port remain owned in one place. The rebuilt installer checksum is `BB415DF6CFD8163FF406C7C1C023CCF1F3C69E7B510BE43E369CE4A70EE88AE2`.
* FIXED 2026-07-09 (TICKET-0045): Launcher Options' `-publicport` read-only field now uses the live effective game port from the active server's `PalWorldSettings.ini` instead of falling back to the originally stored instance port. Network status also syncs stale stored ports when it resolves a different live port. The rebuilt installer checksum is `4849C5BD3A46DFE7A6C5CC873C7172F7157815C0C461E8F5FD71D1780F1EA216`.
* FIXED 2026-07-09 (TICKET-0046): Reinstall/update port memory now treats the stored Super Admin game port as authoritative once it is custom, enforces that port back into `PalWorldSettings.ini` on launch, and lets older/default instances adopt a custom ini port only when the stored port is still `8211`. The rebuilt installer checksum is `739F2C22E68B60C5B47D5A6C61367CCFE504AA32E96ABFAC7B6C4C202B472C1C`.
* FIXED 2026-07-09 (TICKET-0047): Dashboard roster/player tracking now recovers when Palworld's REST API is running but the ini credential check is incomplete by falling back to the stored local REST management port and by normalizing REST player payload field names. Blank or wrong admin passwords now surface as real REST auth failures instead of the app claiming REST is not ready. The rebuilt installer checksum is `650B493B8A108A33F9EFFDD25C440DFEFBDC47953A96DE4F553948689180C243`.
* FIXED 2026-07-09 (TICKET-0048): Palworld REST Unauthorized errors caused by an empty `AdminPassword` are now self-healed on launch. Starting a server through AutoPalExpress preserves the live ini, enables REST, preserves any user-set AdminPassword, and generates a random AdminPassword only when the field is missing or blank. The rebuilt installer checksum is `59DC70DB4707C0DBBFFBFF13E9850BF3B59E10111BC18B240904600AD43176F9`.
* FIXED 2026-07-09 (TICKET-0049): Added a release-delta changelog section covering TICKET-0041 through TICKET-0048, rebuilt the final executable/installer, and updated the release checksum to `18D018D9A59C247E36F0CF4CD2622AC75F1E4A6D27FB01F4E2B890993944DC1E`.
* FIXED 2026-07-10 (TICKET-0050): Game-port enforcement now edits the live `PalWorldSettings.ini` when present instead of rebuilding from `DefaultPalWorldSettings.ini`, so remembering/enforcing the Super Admin port no longer risks resetting unrelated world settings.
* FIXED 2026-07-10 (TICKET-0051): Rebuilt the packaged executable and installer after TICKET-0050. Current installer checksum is `1116A3ABE445BC3684415134BCC90FFA819F4FB1948305A426A2F04C74A8E034`.

---

## Future Ideas

* Real domain name -> makes Let's Encrypt or a stable Cloudflare Tunnel practical, removing the plain-HTTP trade-off entirely.
* Full process adoption on backend startup (re-attaching Stop/Restart control to an already-running server, not just status metrics) would further improve the "forgets running state on restart" issue.
* Restore-from-backup UI (backups are already structured per-folder with a `meta.json`, deliberately left as a future extension point when the backup feature was built).
* A real automated test suite, if the project's complexity keeps growing - currently proportionate given the single-developer, live-verification-heavy workflow used so far.

---

## Notes

* The `.claude` memory system and ticket folder are active project records. Git exists, but may need a safe-directory exception from the host user before sandboxed git commands work.
* The distributable installer (`PalworldServerAdmin-Setup.exe`) has been built and verified multiple times this project (silent install/uninstall, real launch, TLS-then-reverted rebuilds) - see memory/decisions.md for the TLS history specifically, since that installer was rebuilt more than once for reasons worth understanding before touching TLS again.
* This project involves a live, real Palworld dedicated server and real players (the developer's own friends) - verification throughout has deliberately used real live testing (real UAC prompts, a real router, a real connected player for RCON) rather than only theoretical/unit testing, but destructive actions against real live sessions (e.g. testing kick/ban) have been deliberately avoided even when live-testing was otherwise appropriate.
