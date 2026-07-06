# Project Memory

This file represents the long-term memory of the project.

Update continuously.

---

## Project Vision

A self-hosted Palworld Dedicated Server admin panel that lets a small group of friends jointly run a modded server without anyone needing SSH access, shared admin passwords, or manual config-file editing. The host is the permanent "super admin"; friends register via invite code as regular admins with full day-to-day operational access. Optimized for "a handful of friends running their own server," not a hosted multi-tenant SaaS.

---

## Current Milestone

Core feature set is complete and has been exercised live: multi-instance server management (deploy new via SteamCMD, or import existing), real process control, a generic World Settings (`.ini`) editor, mod browsing/installing (Nexus API + hash-verified manual file installs), UE4SS installer, networking (UPnP port forwarding, Windows Firewall automation, public IP display), multi-user auth with invites, and - most recently - a real RCON client powering scheduled backups/restarts, restart warnings, join/leave announcements, and a now-real Players page (list/kick/ban via RCON). Currently in a polish/hardening phase rather than adding wholesale new feature areas.

---

## Active Priorities

* Decide whether to extend RCON usage to the manual Stop/Restart buttons too (currently still `CTRL_BREAK_EVENT`-based, never confirmed graceful) now that a working RCON client exists.
* Consider a fix for `process_manager` forgetting a server is running after a backend restart (no process adoption currently).
* Remaining mocked surfaces (Logs page, the general Settings blob's own fields) could be wired to something real if they matter to the user - not yet requested.

---

## Technical Debt

* No automated test suite anywhere in the project - all verification has been manual/live (see memory/tech_stack.md Notes).
* `process_manager`'s running-state tracking is in-memory only, lost on every backend restart.
* No confirmed graceful shutdown path for the manual Stop/Restart actions.
* No git repository has been initialized for this project yet, so there's no commit history, branches, or PR workflow - everything has been tracked through direct conversation and these memory files instead.

---

## Known Issues

* FIXED 2026-07-06 (TICKET-0006, see Decision Log-adjacent ticket_memory entry): Kicking a player completed without error but didn't disconnect them. Root cause found from the user's own server console log (`User id: steam_<SteamID64>`) - `KickPlayer`/`BanPlayer`/`UnBanPlayer` need that `steam_`-prefixed ID form, not the bare numeric ID `ShowPlayers` returns. Confirmed fixed against a real kick.
* A server started/already running before an admin-backend restart will show as "offline" in the tool afterward, even though it's genuinely still running and RCON-reachable - the tool's scheduler (restart/join-leave checks) goes silent for it until it's restarted through the tool.
* FIXED 2026-07-06 (see Decision Log, two entries): `process_manager.start()` was launching servers with the stale `gamePort` stored in `instances.json` instead of whatever was actually live in `PalWorldSettings.ini`. Went through two passes - first just made launch read the ini (matching what `network.py` already did for port-forwarding), then went further at the user's request: World Settings' "Game Port" field is now the one editable place for a server's port, and launch actively enforces + syncs it both ways (writes it into the ini if missing, writes the resolved value back into `instances.json`) instead of just resolving a read. Also fixed a latent bug this surfaced: `palworld_settings._get_field`/`_set_field` couldn't see a key that happened to be the very first field in `OptionSettings=(...)` (real Palworld files never hit this since `Difficulty` is always first, but the new self-heal path did).
* FIXED 2026-07-06 (see Decision Log): found while debugging a real live deployment where a client PC and a new dedicated server machine, both on the same home router, collided over the router's single external-port-8000 UPnP mapping - the client's earlier "Open Remote Access" click was still occupying it, silently redirecting the public IP back to the client. Neither `RemoteAccessPanel` nor `PortForwardPanel` could show/remove a mapping unless the current browser session had just created it (`forwarded` was local-only state). Both panels now ask the router directly what's mapped (`upnp.get_port_mapping`) and can remove any mapping regardless of which machine created it - this is also the general answer to "the router's own UI won't let me remove a UPnP entry."
* Palworld's RCON has no per-player whisper or teleport command, so those two Players-page actions remain frontend-mocked with no real backend equivalent possible without a different API.
* The panel is plain HTTP - if port-forwarded for remote friend access, credentials/session cookies travel unencrypted. Mitigated partially by per-IP login rate limiting, but not eliminated (deliberate, informed trade-off - see Decision Log).

---

## Future Ideas

* Real domain name -> makes Let's Encrypt or a stable Cloudflare Tunnel practical, removing the plain-HTTP trade-off entirely.
* Process adoption on backend startup (detect an already-running `PalServer.exe` for a known instance and re-attach tracking) would fix the "forgets running state on restart" issue.
* Restore-from-backup UI (backups are already structured per-folder with a `meta.json`, deliberately left as a future extension point when the backup feature was built).
* A real automated test suite, if the project's complexity keeps growing - currently proportionate given the single-developer, live-verification-heavy workflow used so far.

---

## Notes

* No git repo exists yet for this project - a generic ".claude" project framework was added on 2026-07-05 (this memory system is part of it), but the framework's own suggested `tickets/`, `scripts/`, and git setup haven't been adopted yet. Don't assume they exist without checking.
* The distributable installer (`PalworldServerAdmin-Setup.exe`) has been built and verified multiple times this project (silent install/uninstall, real launch, TLS-then-reverted rebuilds) - see memory/decisions.md for the TLS history specifically, since that installer was rebuilt more than once for reasons worth understanding before touching TLS again.
* This project involves a live, real Palworld dedicated server and real players (the developer's own friends) - verification throughout has deliberately used real live testing (real UAC prompts, a real router, a real connected player for RCON) rather than only theoretical/unit testing, but destructive actions against real live sessions (e.g. testing kick/ban) have been deliberately avoided even when live-testing was otherwise appropriate.
