# Architecture Decisions

Record important technical decisions.

---

## Decision Template

### Decision

Describe the decision.

### Reason

Why it was chosen.

### Alternatives

List alternatives considered.

### Consequences

Positive and negative impacts.

### Date

YYYY-MM-DD

---

Append new decisions below previous ones. Never delete historical decisions.

---

### Decision

Manage multiple, fully isolated Palworld server instances (own folder, own mods, own ports) instead of a single global server configuration.

### Reason

A single global config meant mods, settings, and ports for different servers could conflict; isolating each server end-to-end avoids that entirely.

### Alternatives

Single global server path (the original design).

### Consequences

Most services now take an `instance`/`instance_id` parameter and persist per-instance state under `data/instances/<id>/`. More moving parts, but each server is genuinely independent. Introduced a real footgun later: the "active instance" that most routes act on is a single shared value, not scoped per browser session - a friend once started the wrong server because of this. Partially mitigated with a visible instance-picker directly on the Start Server button, not fully redesigned.

### Date

2026-07-05

---

### Decision

No TLS/HTTPS - the admin panel is served over plain HTTP.

### Reason

TLS was actually built (self-signed certificate, auto-generated, wired into both entry points) and worked correctly. But the user found the resulting "connection isn't private" browser warning alarming, and then asked for it to not appear at all for friends they distribute the app to. Without a real domain name, the only way to fully eliminate that warning is either an external tunneling service (Cloudflare Tunnel) or turning the self-signed cert into a locally-trusted root CA. The CA approach was attempted and correctly blocked by a safety check: a stolen private key would then be able to mint trusted certificates for *any* domain in anyone who'd imported it, not just this app - a much bigger blast radius than the problem being solved. The user then asked to remove the certificate entirely rather than pursue the external-service route.

### Alternatives

Self-signed certificate (built, then reverted), self-signed cert promoted to a root CA for friend distribution (attempted, blocked by a safety check before completion, never shipped), Cloudflare Tunnel (discussed, declined - no domain name available and didn't want an external account/service).

### Consequences

Login credentials and session cookies travel unencrypted if the panel is port-forwarded for remote friend access. Partially mitigated by per-IP login rate limiting (unrelated to transport security, but reduces brute-force risk). Revisit if a real domain name ever becomes available.

### Date

2026-07-05

---

### Decision

Mod installation from outside Nexus's automated (Premium-only) flow is verified by comparing the uploaded file's exact MD5 hash against Nexus's own reverse-lookup catalog (`md5_search`), rejecting anything that doesn't match a real, published file.

### Reason

Went through three prior designs, each replaced because of a real problem: (1) an iframe-embed idea to route around Nexus's Premium paywall was declined as a ToS-circumvention attempt; (2) a "paste a Nexus mod-page URL + upload a file" design was removed at the user's request because the URL was only ever a soft, unverifiable claim about the uploaded bytes - too much risk for a live game server's Mods folder; (3) a "server fetches a direct download URL you provide" design was SSRF-guarded and worked, but the user found Nexus's actual manual-download flow doesn't hand out a simple, stable direct link in practice, making it impractical. The MD5 hash-verification approach is the first one that's both genuinely safe (an exact cryptographic match against Nexus's real catalog, not a claim) and practically usable (works with whatever file the user already has, however they got it).

### Alternatives

Iframe embed (declined), URL-claim + upload (removed as too risky), server-side direct-URL fetch with SSRF guarding (removed as impractical), plain unrestricted upload (never seriously considered - the whole point was to avoid this).

### Consequences

Super-admin-only. A file with no match on Nexus is hard-rejected immediately, no partial trust. Slightly more friction for the user (must have the exact original file, not a renamed/re-zipped copy) in exchange for a real security guarantee.

### Date

2026-07-05

---

### Decision

Palworld's RCON (Source RCON protocol) was implemented from scratch in `app/services/rcon.py` rather than using a third-party RCON library.

### Reason

Consistent with this project's existing pattern of implementing small, well-understood protocols directly rather than adding a dependency (see the UPnP client, also from scratch) - keeps the PyInstaller build simple and avoids depending on a library's maintenance status for something this small (~30 lines of actual protocol).

### Alternatives

A third-party Python RCON client library.

### Consequences

Had to discover and handle a real protocol quirk live (the auth flow's double-packet response) that isn't always obvious from the spec alone - required live testing against a real server with a real connected player to fully confirm. This client now backs real save/broadcast/shutdown-countdown on Server Control, the whole automation/scheduler feature (backups, restart warnings, join/leave messages), and the Players page (list/kick/ban), so correctness here has a wide blast radius across the app.

### Date

2026-07-06

---

### Decision

`process_manager.start()` now resolves the actual game port from the live `PalWorldSettings.ini` (falling back to the instance's stored `gamePort` only if the ini has none or doesn't exist yet), via a new shared `palworld_settings.effective_game_port()` helper, instead of launching with the stored `gamePort` unconditionally.

### Reason

A real bug, reported live from a friend's machine: a server deployed at port 8213 kept coming up on 8211 instead. Root cause - editing "Game Port" on the World Settings page writes `PublicPort` straight into the live ini (`server_settings.py` -> `palworld_settings.write_settings()`) but never updates the instance's stored `gamePort` in `instances.json`. `process_manager.start()` was launching `PalServer.exe` with `-port={instance['gamePort']}` unconditionally, so once those two values diverged, the server actually launched on the stale stored port. `network.py` already had this exact "ini wins, stored value is just a fallback" resolution logic (`_resolve_port`, used for firewall/UPnP port forwarding) - `process_manager` just hadn't been kept consistent with it.

### Alternatives

Sync `instance["gamePort"]` in `instances.json` whenever World Settings writes `PublicPort` (rejected: the ini can also be edited by hand or by the game itself, so instance_store would still drift out of sync again over time - resolving from the ini at the point of use is the only fix that can't drift).

### Consequences

`gamePort` in `instances.json` is now clearly just the port an instance was created/deployed with, not necessarily its current one - the ini is the single source of truth once one exists. Extracted as a shared helper (`palworld_settings.effective_game_port`) specifically so `process_manager` and `network.py` can't drift apart from each other the same way again.

### Date

2026-07-06

---

### Decision

Went further than the port-resolution fix above: World Settings' "Game Port" field is now the single place a server's port is ever edited after creation, and the port is actively *enforced and synced* at the moment a server launches, not just read.

### Reason

The user pointed out the previous fix (read the ini, fall back to stored `gamePort`) still left two things that could disagree with no correction happening - it papered over drift rather than closing it. Wanted: one editable place, and a launch path that actively makes everything agree rather than just picking a winner. Concretely: `process_manager.start()` now calls a new `palworld_settings.enforce_game_port()` (ini wins if present; otherwise writes the stored `gamePort` into the ini so the field exists from then on - self-healing for servers imported from outside this tool, which often have no `PublicPort` field at all) and then writes the resolved value back into `instances.json` via `instance_store.update_game_port()` if it changed. Editing the port via World Settings (`server_settings.py`) now also calls `update_game_port()` immediately, so the stored value never has a chance to go stale in the first place.

### Consequences

Discovered and fixed a real latent bug while building this: `_get_field`/`_set_field` in `palworld_settings.py` located a key via a lookbehind for a preceding `,` or `(`, but they operate on the OptionSettings body with the opening paren already stripped - so a key that happened to be the very first field in the file was invisible to every read/write in the module (`read_public_port`, `write_settings`, `read_rcon_config`, etc.), not just the new port-sync code. Real Palworld inis always have `Difficulty` first so this never surfaced before, but the new self-heal path (writing `PublicPort` into a body that starts out empty) would have hit it immediately. Fixed the lookbehind to also match start-of-string, and fixed `_set_field`'s empty-body case to not prepend a stray leading comma. Verified against real dev-machine `PalWorldSettings.ini` files (~100 fields) that every other field still round-trips byte-for-byte unchanged.

### Date

2026-07-06

---

### Decision

`RemoteAccessPanel` and `PortForwardPanel` now derive their "is this forwarded" state from the router's actual current UPnP mapping (`/network/upnp/status`'s new `adminMapping`/`gameMapping` fields), instead of a local-only `forwarded` React boolean that only ever became `true` after a successful forward call in that same browser session.

### Reason

Directly follows from diagnosing the client-PC-vs-server-machine port collision (same decisions.md, port-sync entries above): both machines are on the same home network/router, and the client PC's earlier "Open Remote Access" click was still occupying the router's external port 8000 mapping, silently redirecting the public IP back to the client instead of the actual server. The user then asked for the tool to be able to remove that mapping - it turned out the backend already could (UPnP's `DeletePortMapping` only needs the external port/protocol, not the original owner), but neither panel's UI could ever discover that a mapping existed unless it was created in the current session, so the "remove" control was never shown for a mapping created earlier, or by a different machine. Added `upnp.get_port_mapping()` (`GetSpecificPortMappingEntry`) to ask the router directly what's actually mapped right now, including which internal IP holds it.

### Alternatives

Track mapping state in the app's own local storage/config instead of asking the router (rejected: the whole problem is that a mapping can be created by a *different machine's* install, which wouldn't share that local state at all - only the router itself has the real answer).

### Consequences

Both panels now show, and can remove, a mapping regardless of who created it or when - including telling the user which machine's LAN IP currently holds it, which is exactly the fact needed to recognize "this is pointing at the wrong PC." Degrades gracefully (treats as "no mapping visible") if a router supports Add/Delete but not the GetSpecificPortMappingEntry query, rather than failing the whole status check.

### Date

2026-07-06

---

### Decision

Correction to the above: "Remove This Forward" is no longer conditional on the mapping-detection query succeeding - it's now always shown alongside "Forward" whenever a UPnP router is present at all.

### Reason

The user installed that build and reported the button simply never appeared. `GetSpecificPortMappingEntry` (used to detect an existing mapping) is nowhere near as universally supported across real consumer router UPnP stacks as `AddPortMapping`/`DeletePortMapping` are - plausible that the user's router does the latter fine but fails/misbehaves on the former, which `_mapping_info()` was already designed to degrade silently on (by design, so a flaky query wouldn't break the whole status check) - but that same silent degrade also meant the button could never appear for them at all. The user's own diagnosis was correct: since `delete_port_mapping` already safely no-ops (UPnP error 714) when there's nothing to remove, there was no real reason to gate the button's visibility on detection succeeding in the first place.

### Alternatives

Try to make mapping detection more robust (e.g., retry, alternate SOAP action forms) - rejected as unfalsifiable without access to the user's actual router to test against, and unnecessary: removing the visibility condition entirely sidesteps the reliability problem rather than chasing it.

### Consequences

"Forward" and "Remove" are now independent, always-available actions rather than a state machine toggling between them - simpler, and immune to however reliable any given router's status-query support turns out to be.

### Date

2026-07-06

---

### Decision

`process_manager._tree_cpu_ram()` now divides its summed `cpu_percent` by `psutil.cpu_count()` before returning it.

### Reason

Reported: the Dashboard's CPU% didn't match Task Manager. Root cause - `psutil.Process.cpu_percent()` reports usage relative to a single CPU core (100% = one core fully busy) by default, while Task Manager normalizes to all logical cores (100% = the whole CPU maxed out). Summing this across the PalServer process tree without dividing by core count meant the reported percentage was inflated by a factor equal to the machine's logical core count - confirmed directly by spawning a process that fully pegs one core on this (16-core) dev machine: it read ~100%+ before the fix, ~7% after, which is what Task Manager would actually show.

### Alternatives

None seriously considered - this is a well-known psutil normalization gotcha with one correct fix.

### Consequences

CPU% now matches Task Manager's convention. RAM reporting was checked in the same pass and found already correct (sums `memory_info().rss` across the same process tree, which is the right scope).

### Date

2026-07-06

---

### Decision

`KickPlayer`/`BanPlayer`/`UnBanPlayer` now send a Steam player's ID as `steam_<SteamID64>` rather than the bare numeric ID `ShowPlayers` returns.

### Reason

Kicking a player completed without any RCON error but never actually disconnected them. `ShowPlayers`' own CSV output gives the bare numeric SteamID64 with no prefix, but the user's server console logs a connecting Steam player as `User id: steam_<SteamID64>` - Palworld's kick/ban commands need that same prefixed form to match a connected player; the bare numeric ID silently matches nobody, and Palworld's response for that case doesn't contain the word "failed" either, so the existing `_check_result()` error-detection couldn't catch it. A `_kick_ban_id()` helper now adds the prefix only when the ID is purely numeric (leaving an already-prefixed ID, or a non-Steam `playeruid` fallback, untouched). Confirmed fixed against a real connected player.

### Alternatives

None - this is Palworld's actual RCON ID format requirement, discovered from the user's own server console output rather than guessed.

### Consequences

Ban/UnBan share the same `_kick_ban_id()` helper and should be correct for the same reason, though only Kick was explicitly confirmed live. If a non-Steam (e.g. Xbox/Game Pass) player's ID ever needs different handling, `_kick_ban_id()` is the one place to extend.

### Date

2026-07-06

---

### Decision

A full security audit was run at the user's request (both static code review and live exploit attempts against sandboxed copies of the suspicious code paths, not the real production server). Four confirmed issues were fixed: RCON credential exposure to non-super-admins (TICKET-0008), regular admins registering arbitrary host folders as "instances" and triggering native dialogs (TICKET-0009), a login timing side-channel revealing valid usernames (TICKET-0010), and sessions never expiring server-side (TICKET-0011).

### Reason

Same rationale as each linked ticket. The instance/mods-path restriction (TICKET-0009) draws a line consistent with how comparable game-server panels (Crafty Controller, Pterodactyl) split responsibilities: server registration/deployment is an admin-level action, regular users are scoped to operating servers that already exist - this project's own stated model ("friends register as regular admins with full day-to-day operational access") means *operating*, not *provisioning*.

### Alternatives

For the instance-registration restriction: could have instead validated/restricted *which* folders any user can register (e.g. must be under a known games directory) rather than gating by role. Rejected as more complex and less clearly correct than simply matching the established admin/regular-user split already used elsewhere in this app (Nexus connect, install-from-file, user management).

### Consequences

Two lower-severity findings from the same audit were intentionally deferred, not fixed in this pass:
* `firewall.py`'s UAC-elevated `.bat`-file rule-name interpolation is a latent batch-injection primitive - not currently exploitable since every caller today passes a validated int/enum, never free-form text, but the function itself has no defense of its own if that ever changes.
* The login rate-limiter (`login_throttle.py`) is keyed by `request.client.host`, which is correct today but will become a single shared bucket for every external visitor once the in-progress Nginx Proxy Manager / reverse-proxy setup goes live (all requests will appear to come from the proxy's own IP) - needs trusted-proxy header handling (`X-Forwarded-For`) added as part of that migration, not before.

Verified safe (not vulnerable) in the same pass, worth remembering so they aren't re-litigated from scratch later: zip-slip/path-traversal in mod installation (tested 5 exploit payload variants, all correctly rejected), the Nexus API key (confirmed never present in any API response to the browser), subprocess command construction throughout (list-form exec, never shell string interpolation), and router-level auth enforcement (looked like several routers had no auth at first glance - it's applied correctly via `include_router(..., dependencies=...)` in `main.py`, not per-route).

### Date

2026-07-06
