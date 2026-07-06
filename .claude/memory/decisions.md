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
