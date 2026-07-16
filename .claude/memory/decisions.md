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

---

### Decision

A second, fresh security audit (TICKET-0013, TICKET-0014) was run after the TICKET-0012 access-control changes, this time explicitly informed by reading Crafty Controller's source (a comparable game-server panel) for inspiration on its GitLab repo. Two issues fixed: `spa_fallback`'s SPA-serving route had no explicit path-containment check of its own (`main.py`), and `automation.router` was left at regular-admin level after TICKET-0012 locked its only UI entry point to super admin.

### Reason

Crafty Controller's static file handler extends Tornado's `StaticFileHandler` rather than hand-rolling path concatenation, which is exactly the gap `spa_fallback` had - it happened to be safe only because Starlette normalizes `..` out of URL paths before the handler runs, not because the function did anything itself. Confirmed this concretely: calling the route function directly with a raw traversal string (bypassing whatever the HTTP/ASGI layer normalizes) proved the underlying `_FRONTEND_DIR / full_path` resolution genuinely escapes the frontend directory - this route has no auth dependency at all, so a real gap here would have been unauthenticated arbitrary file read. The automation-router gap was a straightforward miss: TICKET-0012 locked the Settings tab's UI but didn't re-audit which backend routers actually lived behind it.

### Alternatives

None for either fix - both are the direct, minimal corrections (explicit containment check matching the existing `mod_installer._safe_extract` pattern; matching `automation.router`'s dependency to the already-established `_super_admin_only` mechanism).

### Consequences

`spa_fallback` no longer depends on incidental Starlette behavior to stay safe - relevant given the in-progress Nginx Proxy Manager reverse-proxy setup could plausibly have changed how request paths reach this handler. Automation is now consistently super-admin-only at both layers. The two findings deferred in the previous audit entry (firewall.py batch-injection shape, login_throttle's per-IP keying under a future reverse proxy) remain open and unaffected by this pass.

### Date

2026-07-06

---

### Decision

Both floating console windows (the admin tool's own, and the one Palworld's dedicated server creates for itself) were eliminated (TICKET-0019). `process_manager.start()`'s launch now passes `CREATE_NO_WINDOW`; the admin backend itself is now packaged windowed (`console=False`), with `desktop_app.py` redirecting `sys.stdout`/`sys.stderr` to a real log file before anything else runs.

### Reason

User wanted everything to live inside one GUI (the browser tab) instead of two separate floating windows.

### Investigation (worth remembering, so it isn't re-derived from scratch)

Real, live testing against the dev machine's actual `TestServer1` instance, before writing any code:
* PalServer.exe (the launcher we spawn) is not where the real game logic runs - it spawns a grandchild, `PalServer-Win64-Shipping-Cmd.exe`, which allocates its **own** console independent of how the launcher was started. `CREATE_NO_WINDOW` on our own `subprocess.Popen` call was confirmed (via `Get-Process ... MainWindowHandle`, checked twice, including through the real integrated `process_manager.start()`/`stop()` functions) to suppress the **entire** tree's window - launcher, grandchild, and the `conhost.exe` Windows spins up to host the console all show no window - not just the immediate child's.
* Real console *content* cannot be captured this way, though. Piping the launcher's stdout captured zero lines even after a real 40-second run with the server fully up and genuinely writing world saves - Palworld writes through its own low-level console API, not the standard stdout handle. It also doesn't write a persistent log file by default: tested again with `-log` passed explicitly, and `Pal/Saved/Logs/` stayed empty across multiple full real runs. Getting real log *content* into the app would need reading the game's own hidden console screen buffer directly (far more invasive, not attempted) - this remains open, unrelated future work, not something this ticket claims to solve.
* A windowed (`console=False`) PyInstaller build has `sys.stdout`/`sys.stderr` as `None`, since there's no console to attach either to - confirmed this would otherwise crash the instant anything writes to them (a stray `print()`, the logging module's default `StreamHandler`, or uvicorn's own internal logging config, which resolves `"ext://sys.stderr"` against whatever `sys.stderr` is when `uvicorn.run()` sets up its logging). Fixed by redirecting both to a real file at the very top of `desktop_app.py`'s `main()`, before uvicorn or the app itself is imported.

### Consequences

Real Palworld console log content is still not visible anywhere in the app - the existing mocked "Logs" page is unaffected by this change and remains a separate, harder problem if ever wanted. A startup crash with no seed data to show now writes to `backend.log` and shows a native message box, instead of a scrolling console - this was added specifically because removing the console also removes the only way a fatal startup error would previously have been visible at all.

### Date

2026-07-07

---

### Decision

Dashboard status now samples CPU/RAM from discoverable Palworld processes inside the selected server folder, not only from the remembered launcher process tree.

### Reason

The user reported the Dashboard showing 0% CPU and low RAM while Task Manager showed real usage. The prior CPU-normalization fix was still correct, but the sampling scope was too narrow: `process_manager` only knew about the launcher process started during the current backend run, while the actual work can live in `PalServer-Win64-Shipping-Cmd.exe`, and the backend can also restart while Palworld keeps running. Status now combines the tracked process tree with any `PalServer.exe`/`PalServer-Win64-Shipping-Cmd.exe` processes whose executable, working directory, or command line resolves under the selected instance's server folder.

### Alternatives

Trust Palworld REST metrics for CPU/RAM (not available there), sample every process with a Palworld-like name globally (rejected because multiple instances can run on one host), or implement full process adoption immediately (deferred because the reported bug was status metrics, while Stop/Restart control has more lifecycle risk).

### Consequences

Dashboard CPU/RAM should now match the selected server's Task Manager process usage much more closely while preserving the existing Task Manager-style whole-machine CPU normalization. This is status discovery only, not full process-control adoption. Missing Palworld REST frame-time data now renders as unavailable in the UI instead of `0 ms`.

### Date

2026-07-08

---

### Decision

Replace the app's Palworld RCON client with Palworld's official local REST API for game-level operations.

### Reason

The official Palworld Server Guide documents a REST API gated by `RESTAPIEnabled=True`, `RESTAPIPort`, and HTTP Basic Auth. It covers the operations AutoPalExpress was using RCON for: server info/metrics, player list, announce, kick/ban/unban, save, shutdown, and force stop. Using the documented REST API is a better public-release default than maintaining a raw Source RCON protocol client.

### Alternatives

Keep RCON as the primary control path (rejected because the user asked to replace it and the REST API now covers the needed actions). Support both RCON and REST side by side (rejected for this pass because it doubles configuration and failure modes right before release). Rename the persisted `rconPort`/`rconReady` fields immediately (deferred to avoid a broader data migration; they now act as compatibility aliases while the UI says REST API).

### Consequences

`app/services/rcon.py` was removed. `app/services/palworld_rest.py` now handles `/v1/api/*` calls against `127.0.0.1` with username `admin` and the server's `AdminPassword`. Starting a managed server enforces `RESTAPIEnabled=True` and writes `RESTAPIPort`. Players, save, announce, backups, scheduled restart warnings, join/leave checks, metrics/status enrichment, and kick/ban/unban now use REST. Manual Stop/Restart and shutdown countdown try REST shutdown first, then still use local process cleanup so the app's Windows process tracking stays correct.

### Date

2026-07-08

---

### Decision

Nexus browsing and manual-file verification now use Nexus Mods' public GraphQL API without a personal API key, and one-click Nexus downloads are paused for public release until AutoPalExpress follows Nexus's registered app/OAuth path.

### Reason

Nexus support pointed to the API Acceptable Use Policy and suggested GraphQL if the app only needs metadata and not file downloads. The policy says personal API keys are tolerated for testing/personal use, but public-facing apps should be registered, must identify requests with `Application-Name`/`Application-Version`, and should not use personal API keys in place of a public app integration. Public browsing and MD5 file-hash verification both work through `https://api.nexusmods.com/v2/graphql`, so there is no good reason to ask community users to paste a personal key for those flows.

### Alternatives

Continue requiring the super admin's personal API key for browsing and verified manual installs (rejected for public release because it conflicts with the direction Nexus gave). Keep one-click downloads behind the stored Premium personal key (rejected until Nexus approves the registered app/OAuth approach). Remove Nexus integration entirely (rejected because metadata browsing and hash verification are still useful and can be done through GraphQL).

### Consequences

Mods page browsing no longer requires a Nexus API key. The installer no longer asks for one. Super Admin's Nexus panel now explains that no key is needed for the current release and lets older installs remove a saved key. Manual "Install From File" still verifies the exact uploaded bytes against Nexus before installing. The old API-key validation code remains for backward compatibility/testing, but automated Nexus downloads now return a clear 403 telling users to download on Nexus and use verified file upload.

### Date

2026-07-07

---

### Decision

The mocked Logs page was replaced with a real activity feed built from events this app already knows about or performs (TICKET-0020), instead of Palworld's own console text.

### Reason

Following directly from TICKET-0019's console-window work, the user asked to see the old console's actual log content in the panel. Investigating further found the real reason nothing could be captured: `Pal/Saved/Config/WindowsServer/ImGui.ini` exists on the real test server install, confirming Palworld's dedicated server renders its console via **Dear ImGui** - a GPU-rendered overlay, not a real Win32 text console. There is no text buffer anywhere to read; the console's content is pixels, not characters. This is strictly worse than "hard to capture" - it's not text at all, so console-buffer-reading APIs (`ReadConsoleOutputCharacter` etc.) wouldn't work regardless of console visibility. The only remaining paths (screen-capture OCR, or scanning the game's process memory for ImGui's internal text buffers) were judged unreliable and inappropriate to build against a third-party game process, so they weren't attempted - confirmed this pivot with the user via `AskUserQuestion` before writing any code.

### Consequences

`app/services/activity_log.py` is a new, independent real event log (JSON Lines, persisted, capped at 2000 entries with the file trimmed back down past ~2MB), fed by `process_manager` (start/stop/force-kill), `scheduler.py` (backup/restart outcomes, player join/leave), and `players.py` (kick/ban/unban, attributed to the acting admin). Player join/leave logging was deliberately decoupled from the `joinLeaveMessages` automation toggle - that toggle now only controls the in-game chat broadcast, not whether the activity is logged - since an admin may want the log visibility without in-game spam. This closes out the Logs page's mocked status from the README, but it is a genuinely different feature than "the old console" - real Palworld engine log text remains permanently out of reach short of OCR/memory-scanning, which this project has decided not to pursue.

### Date

2026-07-07

---

### Decision

Initial setup (super admin account, Nexus API key, an optional first server) moved into the Windows installer (TICKET-0018), applied automatically on first launch via a new `first_run_setup.py` service reading a one-time seed file the installer writes. New server deployments now always go in `data_dir()/servers/<name>` instead of a browsed folder.

### Reason

User wanted fewer manual post-install steps, with the actual SteamCMD download happening during the installer itself (with visible progress) rather than deferred to first app launch. The seed-file approach (installer collects raw answers, the *app* does all the real work - hashing, Nexus validation, deployment) was chosen specifically so there's exactly one place that knows how to hash a password or validate a Nexus key - reimplementing either in Inno Setup's Pascal Script would create a second, harder-to-keep-in-sync copy of security-relevant logic for no benefit.

### Alternatives

Running the SteamCMD deploy during the installer via a separate standalone script (rejected - would duplicate `deploy_jobs`/`steamcmd.py`'s already-working, already-tested orchestration instead of reusing it). Doing the account/Nexus/deploy work synchronously inside the installer's own process (not feasible - Inno Setup's Pascal Script has no async HTTP client and no reason to reimplement PBKDF2 hashing).

### Consequences

Every seeded step (account, Nexus, deploy) has a pre-existing manual fallback already built into the app, so a failure partway through the seed processing degrades to "you finish that one step yourself" rather than a broken install. The plaintext password sits in `{app}\first_run_seed.json` for the brief window between install and first launch (the installer launches the app automatically, so this window is normally seconds) - accepted as consistent with this app's whole security model (a single local admin setting up their own machine, not a shared/multi-user server). Found two real Inno Setup Pascal Script pitfalls the hard way (compile-tested, not just written and assumed correct): `#13`/`#10` character literals at the start of a line are misread as preprocessor directives by ISPP (switched to `Chr(13)`/`Chr(10)`), and the type is `TInputQueryWizardPage`, not the more obvious-seeming `TInputQueryPage`. Also corrected a UI-freeze risk before it shipped: a naive `Sleep(1000)`-per-tick polling loop would have made the wizard window look hung for minutes, since Inno Setup's `[Code]` runs on the UI thread - changed to short ticks with an explicit repaint.

### Date

2026-07-06

---

### Decision

Community Server listing is a per-instance Settings toggle that adds Palworld's `-publiclobby` launch argument on the next server start.

### Reason

Users familiar with manually hosting Palworld expect to configure this via launch arguments, but AutoPalExpress owns the launch command and previously hid that surface completely. The Settings page already owns super-admin-only instance management, so the option belongs on each server instance card where the selected server path, port, and setup controls are visible.

### Alternatives

Expose a free-form launch-arguments textbox (rejected because it invites invalid or unsafe combinations and makes support harder), or add the toggle to World Settings (rejected because this is not a `PalWorldSettings.ini` field and only takes effect at process launch).

### Consequences

The setting is stored in `instances.json` as `communityServer`, defaults false for existing servers, and requires a server restart to take effect. The UI calls that out directly beside the switch.

### Date

2026-07-08

---

### Decision

Settings exposes only non-conflicting Palworld launch arguments as per-instance controls: performance flags, optional `-NumberOfWorkerThreadsServer`, and `-logformat=json`.

### Reason

The current Palworld Server Guide documents launch arguments for port, players, performance, worker thread count, community listing, public IP/port, and log format. AutoPalExpress already has single-source owners for port, player count/deploy defaults, and community listing. Adding only the remaining safe launch-only options preserves the project rule that a setting should be editable in one place.

### Alternatives

Expose every documented argument (rejected because `-port`, `-players`, and `-publiclobby` would duplicate existing app settings), add a free-form launch-argument textbox (rejected for the same support/safety reasons as TICKET-0032), or add public IP/public port overrides immediately (deferred because those overlap the Super Admin networking/share flow and need a clearer single-source design).

### Consequences

Existing servers keep the previous default performance flags unless the super admin turns them off. Worker thread override defaults off and is only applied with the performance flags because Palworld documents it as part of that performance mode. JSON logs default off and add `-logformat=json` only when enabled. All three options require a server restart because they affect the process launch command.

### Date

2026-07-08

---

### Decision

Move the safe Palworld launch-option controls from Settings to World Settings.

### Reason

After using the new controls, the user expected performance flags, worker thread override, and JSON log format to be in World Settings, not inside the server-instance management card. These options change how the active server behaves on next start, so World Settings is the more discoverable home even though they are stored on the instance record rather than in `PalWorldSettings.ini`.

### Alternatives

Keep them in Settings (rejected because the host could not find them there), duplicate them in both pages (rejected because each setting should be editable in only one place), or move every launch argument including Community Server listing at the same time (deferred because the user only asked for the new flags).

### Consequences

World Settings now loads the active server instance and shows a Launch Options panel for these flags. The backend storage and launch behavior from TICKET-0033 stay the same. The API remains super-admin-only for writes; regular admins can view the panel but cannot change these launch arguments.

### Date

2026-07-08

---

### Decision

Launcher flags now have a dedicated super-admin-only sidebar page.

### Reason

After trying Settings and then World Settings, the user still could not find the new controls and explicitly asked for a dedicated sidebar menu named Launcher Flags. Launch arguments are not `.ini` world settings and are not just instance-management metadata, so a direct page is the clearest long-term home.

### Alternatives

Keep the controls on World Settings (rejected because the user reported they were still not visible/discoverable), keep Community Server listing on Settings while only moving newer flags (rejected because `-publiclobby` is also a launcher flag), or duplicate controls in multiple pages (rejected because each setting must have one editable place).

### Consequences

Launcher Flags is the only visible editor for Community Server listing, performance flags, worker thread override, and JSON log format. Settings no longer shows Community Server listing, and World Settings no longer shows launch-option controls. The stored instance fields and process launch behavior are unchanged.

### Date

2026-07-08

---

### Decision

Fresh Palworld server deployments now support an optional super-admin-selected install parent folder while keeping AutoPalExpress' data `servers` folder as the default.

### Reason

The fixed `data_dir()/servers/<name>` convention from TICKET-0018 was simple and avoided arbitrary path input during first-run setup, but users with limited system-drive space need to place large Palworld installs and world data on another drive. The deploy flow already had an internal `install_dir` parameter, so this reopens that flexibility through a controlled super-admin-only path.

### Alternatives

Keep all deployments under app data and tell users to import manually afterward (rejected as too clumsy), or let the browser submit an exact arbitrary install folder (rejected because the app can safely generate the per-server folder name itself).

### Consequences

The in-app deploy wizard and installer first-server flow now let the host choose a parent folder. AutoPalExpress still creates the final per-server folder from the sanitized server name, preserving multi-instance isolation and reducing path mistakes. Regular admins still cannot trigger deployment or native folder pickers.

### Date

2026-07-08

---

### Decision

Visible command windows were restored for both the packaged AutoPalExpress process and the Palworld server process (TICKET-0023), reversing the user-facing part of TICKET-0019 while preserving browser-visible AutoPalExpress logs.

### Reason

The user preferred visible windows because they make it obvious that the processes are running, and expected the Logs page to show what AutoPalExpress itself is printing. The packaged app now uses `console=True` again, and `desktop_app.py` tees stdout/stderr to `backend.log` while still writing to the visible console. `process_manager.start()` no longer passes `CREATE_NO_WINDOW`, so Palworld's own server window is visible again.

### Consequences

The Logs page now has two columns: AutoPalExpress output from `backend.log` and the real server activity feed from `activity_log.jsonl`. This still does not mirror Palworld's own CMD-window text into the browser: prior live testing showed Palworld does not write that text to stdout or a log file, and renders it through its own Dear ImGui/console path. The exact Palworld window is visible separately instead.

### Date

2026-07-07

---

### Decision

Windows startup recovery uses the current user's `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` entry, plus an app setting that auto-starts the active server when AutoPalExpress launches.

### Reason

The user wanted the program to boot with Windows and explain that this is useful for automatically restarting the server if the machine restarts. A current-user Run entry matches the installer's per-user, lowest-privilege model and avoids turning AutoPalExpress into a Windows service or requiring UAC just to open the admin tool at sign-in. The separate auto-start-active-server setting makes the recovery behavior explicit instead of merely opening the dashboard.

### Alternatives

Install a Windows service (rejected as too heavy and privilege-hungry for this app), create a Startup-folder shortcut (rejected in favor of the cleaner Run-key entry), or only start the app without starting a server (rejected because it would not satisfy the reboot-recovery reason).

### Consequences

The feature applies to the Windows account that installed/enabled it. On app launch, AutoPalExpress quietly skips recovery if there is no active server or the server is already running. The installer can seed both the Run entry and the recovery setting when the user selects the startup-recovery task.

### Date

2026-07-09

---

### Decision

Server Control owns Palworld Dedicated Server update checks and upgrades. The backend compares SteamCMD's installed app manifest build id with the current public Steam build id, asks for confirmation when a newer build is found, and only runs the SteamCMD update job while the active server is stopped.

### Reason

Version upgrades are an operational server-control task for hosts, and AutoPalExpress already owns the SteamCMD install path. Reusing SteamCMD avoids inventing a parallel updater and keeps installed servers repairable through the same `app_update 2394010 validate` command that fresh deployments use.

### Alternatives

Always run SteamCMD update without a check (rejected because the user explicitly asked to check first and confirm), expose a manual SteamCMD command/instructions only (rejected because the app can do this safely), or allow updating while the server is online (rejected because replacing server files under a running Palworld process is needlessly risky).

### Consequences

The update check depends on SteamCMD/network availability and Steam's app info output format. If either build id cannot be read, the UI reports that comparison was unavailable instead of claiming up-to-date. Actual updates are pollable background jobs and require the active server to be offline first.

### Date

2026-07-09

---

### Decision

Launcher Flags was renamed Launcher Options and now exposes the exact Palworld launch arguments as separate toggles: `-useperfthreads`, `-NoAsyncLoadingThread`, `-UseMultithreadForDS`, and `-publiclobby`. Nexus Browse also keeps Direct Install visible to super admins even when it is unavailable, with explanatory text for the saved Premium key requirement.

### Reason

The user installed the latest build and still only saw Install File, because the direct Nexus button was hidden until a connected Premium Nexus key was already detected. The feature existed but was too invisible to discover. The launcher page had a similar discoverability problem: the old "Launcher Flags" name and combined performance toggle did not match the requested flags one-to-one.

### Alternatives

Keep hiding Direct Install until fully available (rejected because it makes a supported feature look absent), duplicate launcher flags across Settings or World Settings (rejected because each setting should still be editable in one place), or keep the grouped performance toggle (rejected because the user asked for the specific flags).

### Consequences

Direct install is still gated by the same backend Premium-key checks, but the UI now shows the path and its requirement. Existing combined `performanceFlags` data migrates into three per-argument booleans, and `-publiclobby` stays the single stored community-listing flag behind the Launcher Options toggle.

### Date

2026-07-09

---

### Decision

Installer first-time setup pages now only run when AutoPalExpress has no existing app data.

### Reason

Re-running the installer should work as an update or repair for existing hosts. Asking for server name, username, and password every time made upgrades feel like a fresh install and could create unnecessary `first_run_seed.json` files even though the real account and server registry already live in `%LOCALAPPDATA%\PalworldServerAdmin\data`.

### Alternatives

Always show the setup pages and let the backend reject duplicate account creation (rejected because it still forces needless password entry), or add a full custom install-mode chooser (deferred because existing app data is enough to distinguish fresh setup from update/repair for this single-user Windows app).

### Consequences

Fresh installs still collect first server and super-admin details. Update/repair runs skip those pages, remove any stale first-run seed file, and only replace the application files. Existing app data remains the source of truth.

### Date

2026-07-09

---

### Decision

Restore direct Nexus installs for super admins with a saved Nexus Premium API key, while keeping public GraphQL browsing and verified manual file upload.

### Reason

The user explicitly wanted the old direct-install convenience back. The safer compromise is not to make browsing depend on a personal key again, and not to share a bundled key, but to use the host's own saved Nexus key only when the super admin chooses direct install. The backend still installs through the same zip-slip and zip-bomb guarded extractor used by verified uploads.

### Alternatives

Keep direct installs paused pending Nexus registered app/OAuth approval (rejected because the user asked to restore the old feature), require every user to download and upload files manually (rejected as too clumsy for Premium hosts), or add a free-form URL downloader (rejected because previous designs found that too easy to abuse or misverify).

### Consequences

Direct installs require a connected Nexus account with Premium download access. Users without that still get public mod browsing and Super Admin's verified file upload path. The downloaded archive is stored under app data and recorded on the mod entry so update/reinstall can replace the existing source-mod record.

### Date

2026-07-09

---

### Decision

Launcher Options exposes Palworld's `-publicip` and `-publicport` as enable toggles only. Their values are read-only in Launcher Options and come from the existing Super Admin public-address/game-port flow.

### Reason

Palworld documents these arguments as troubleshooting overrides for community-server detection, but AutoPalExpress already has a single owner for the active server's public address and game port: Super Admin's Share With Friends/networking tools. Letting Launcher Options edit raw IP or port values would create another place for the same setting and make support harder.

### Alternatives

Expose free-form `-publicip` and `-publicport` text fields in Launcher Options (rejected because it duplicates Super Admin and can drift from the real forwarded port), keep deferring these flags entirely (rejected because the user is debugging a real community-listing issue), or append them automatically whenever `-publiclobby` is enabled (rejected because the override should stay explicit).

### Consequences

The backend stores only booleans for these overrides. On start, `process_manager` appends `-publicip=<detected public IP>` and `-publicport=<effective game port>` when enabled. If the public IP cannot be detected, startup continues and logs the skipped `-publicip` override instead of blocking the server.

### Date

2026-07-09
---

### Decision

Steam Query Port (`-queryport`) must be stored, validated, displayed, firewalled, and launched as a separate UDP port from Palworld's game port (`-port`).

### Reason

Live user testing showed that when `-queryport` equals `-port`, Steam query can bind that UDP port first and Palworld starts the actual game listener on the next open port. This made AutoPalExpress log a launch on `8213` while the Palworld server console reported `8214`.

### Alternatives

Remove `-queryport` entirely (rejected because it is still useful for Steam/community server discovery, especially multi-instance hosts), or keep allowing same-port values and document the risk (rejected because it silently changes the effective game port).

### Consequences

AutoPalExpress now migrates old same-port query values, rejects new same-port saves, shows the query port in Launcher Options and Super Admin, and includes the query port in firewall/UPnP checks whenever it differs from the game port.

### Date

2026-07-11

---

### Decision

All app data (`data_dir()`) moved from `%LOCALAPPDATA%\PalworldServerAdmin\data` to `<install folder>\data`, and the installer no longer offers an all-users/admin-elevated install option (TICKET-0123).

### Reason

Direct user request: "I want to set this up so that nothing goes into appdata folder. Everything should live inside the install folder" - a fully self-contained, portable install matters more here than the traditional per-user-profile Windows convention `%LOCALAPPDATA%` was originally chosen for. This is an architecture-level change, so two open questions were resolved with the user via `AskUserQuestion` before writing any code, rather than assumed: (1) how to handle the fact that a normal running process can't write into an admin-elevated Program Files install - resolved by dropping the all-users option entirely (`installer.iss` no longer sets `PrivilegesRequiredOverridesAllowed`, keeping `PrivilegesRequired=lowest`) so the picked folder is always writable by the installing user; (2) what happens to existing users' real data already sitting in the old AppData location - resolved as an automatic one-time migration with a one-time popup telling the user it happened, not a silent move and not a fresh start that would lose their setup.

### Alternatives

Keep the all-users install option and grant folder permissions via `icacls` instead (rejected by the user - more moving parts, more that can go wrong on locked-down machines, for a single-host trusted-friends app that doesn't need it). Fresh start with no migration (rejected - would silently break every existing install, including the maintainer's own).

### Consequences

`app/paths.py`'s `data_dir()` resolves to `install_dir()/"data"` when frozen; `migrate_legacy_data_if_needed()` does a one-time `shutil.move()` of any real legacy AppData folder into that location, called first thing in `desktop_app.main()`. `installer.iss`'s entire `[Code]` section (first-run seed, startup-recovery settings, the Diagnose shortcut's `-DataDir`/`-ReportDir`, `CurUninstallStepChanged`) now points at `{app}\data`; `HasAdminAccount`/`HasServerData` check both the new and legacy locations, since the installer wizard's own page-skip logic runs before the Python app ever gets a chance to migrate anything. A user who reinstalls into a *different* folder than their original install won't have their data found automatically - only the one-time AppData migration is automatic; reinstalling into the same folder preserves data the same way it always has (Inno's uninstaller only removes files it tracks, not runtime-created `data\` contents). Verified end-to-end against the real packaged exe in isolated scratch folders, both the migration path (fake legacy data moved correctly, legacy folder removed) and the fresh-install path (clean boot, everything self-contained, nothing written to AppData).

### Date

2026-07-13

---

### Decision

Two follow-on fixes shipped in the same sitting as the app-data move above: the installer's own `{app}`-referencing checks were moved out of `InitializeWizard` into `NextButtonClick(wpSelectDir)` (TICKET-0125), and a real write-test against the chosen folder was added at that same point (TICKET-0128). Separately, the app itself - including the installed `.exe` - was renamed from "Palworld Server Admin"/`PalworldServerAdmin.exe` to "AutoPalExpress"/`AutoPalExpress.exe` everywhere (TICKET-0127), matching the name already used for the GitHub repo, README, and the Nexus API `Application-Name` identity.

### Reason

TICKET-0125: `{app}` is only valid once Setup has an actual destination folder, which doesn't happen until the directory-selection page is confirmed - `InitializeWizard` runs immediately at startup, before that, so calling `HasAdminAccount`/`HasServerData`/setting the default server folder from there crashed immediately with Inno's own "attempt was made to expand the app constant before it was initialized". TICKET-0128: since dropping the elevation option (previous decision) means Setup can never self-elevate to fix an unwritable folder, a folder that genuinely needs admin rights (most commonly under Program Files) failed deep in the file-copy step with a bare OS error instead of anything actionable. TICKET-0127: direct user request for consistent branding, confirmed via `AskUserQuestion` that the rename should include the actual `.exe`, not just installer display text.

### Alternatives

For TICKET-0128: re-adding an elevation option to fix the underlying permissions problem directly (rejected - reopens exactly the complexity/all-users-install risk the previous decision deliberately avoided; a clear message directing the user to a folder they own is simpler and matches the single-user-picked-location model).

### Consequences

`HasAdminAccount`/`HasServerData`/`ServerInstallDirPage`'s default and the new `CanWriteToDir` write-test all now run from one place, `NextButtonClick(CurPageID = wpSelectDir)`, right after `{app}` first becomes valid. The rename kept the `AppId` GUID untouched (that's what Inno actually uses to recognize "same app" for upgrades, not the name) and added compatibility fallbacks where old-named state could otherwise silently stop being recognized: `HasAdminAccount`/`HasServerData` also check `%LOCALAPPDATA%\PalworldServerAdmin\data` (pre-existing, from the data-move decision above), an `[InstallDelete]` entry removes a stale old-named exe on upgrade, and `GET /firewall/status` also recognizes a firewall rule created under the old "Palworld Server Admin" name so an existing allow-rule doesn't look absent. `app/paths.py`'s legacy-folder-name constant deliberately keeps its literal string value ("PalworldServerAdmin") despite being renamed for clarity (`_LEGACY_APP_DIR_NAME`), since that value has to keep matching what old installs actually used on disk. Known accepted gap: an *upgrading* (not fresh) install keeps its previous Start Menu group folder name, since Inno remembers that by `AppId` independent of the current `DefaultGroupName` - only the shortcut inside it renames. All three fixes were verified against the real compiled installer/exe (window-title inspection via `EnumWindows`, real `/VERYSILENT` installs against both a blocked and a writable folder, a real boot smoke test of the renamed exe), not just by reading the changed source.

### Date

2026-07-13

---

### Decision

Superseding the "everything self-contained in the install folder, no admin installs" decision above (TICKET-0123), after two rounds of direct user pushback in immediate succession: Program Files is now a real, supported install destination again (`installer.iss`'s `PrivilegesRequiredOverridesAllowed=dialog` restored), and all app data moved out of the install folder entirely, to `Documents\AutoPalExpress\data` (TICKET-0129).

### Reason

The user hit the TICKET-0128 write-guard trying to install to Program Files and said "i want it to install to program files like any other normal program." Offered a choice between (a) restoring elevation while keeping the one-folder model via loosened permissions, or (b) the standard Windows convention of splitting program from data - the user picked neither outright, instead adding "could we use my documents instead of appdata? i dont like how appdata is so hidden." The actual resolved design is the standard convention (program and data live independently), just with Documents instead of AppData as the data location, since the user's real objection to the *previous* AppData-based design (before TICKET-0123 even started) was specifically that it's hidden - Documents solves that directly while still being a stable, per-user, always-writable location regardless of where the program itself is installed.

### Alternatives

Loosening permissions on a shared install folder via `icacls` so Program Files could hold both program and data together (rejected - the user's Documents suggestion sidesteps the entire problem instead of managing it, and avoids a real if minor security tradeoff of a world-writable folder under Program Files). Reverting all the way back to the original `%LOCALAPPDATA%` design (rejected - doesn't address the "hidden" complaint that was the deeper, real objection all along).

### Consequences

`app/paths.py` gained `_documents_dir()` (`SHGetFolderPathW`/CSIDL_PERSONAL, so it honors OneDrive-style Documents redirection rather than assuming a plain `~\Documents` path); `data_dir()` now resolves there instead of `install_dir()/"data"`. `migrate_legacy_data_if_needed()` now has two legacy locations to check in order (TICKET-0123's install-folder data, then the original pre-0123 AppData location), moving whichever is found into the new Documents home - `installer.iss`'s `HasAdminAccount`/`HasServerData` check all three locations for the same reason. `install_dir()` now cleanly means only "where the program's own files are" (exe, diagnostics script) - it's never used for anything the app writes to at runtime anymore, which is what makes it safe for `{app}` to be an admin-only folder again. This is the second decision this session that got reversed under direct, immediate user pushback after shipping (see TICKET-0116->0120 for the first, on Run Silently) - worth noting as a pattern: architecture changes driven by "I want X" are worth probing for the *underlying* complaint (here: "hidden," not "not self-contained") before locking in a specific mechanism, since the first mechanism chosen solved the literal request but not the real one.

### Date

2026-07-13

---

### Decision

`app/services/native_dialog.py:pick_folder()` shows its native folder picker via a short-lived PowerShell subprocess (`System.Windows.Forms.FolderBrowserDialog`) instead of `tkinter` in-process (TICKET-0131).

### Reason

User report: clicking any "Browse" button (Import Server, deploy location, UE4SS Mods folder, save import) could close the entire AutoPalExpress process outright. Root cause: every caller invokes `pick_folder()` via `asyncio.to_thread`, so the `tkinter.Tk()` root it created was always initialized on a `ThreadPoolExecutor` worker thread, never the process's actual main thread (uvicorn's event loop occupies that). Tcl/Tk is not safe to initialize outside the main thread - this could bring down the whole packaged process with a low-level native failure that bypasses Python's own exception handling entirely, rather than failing gracefully.

### Alternatives

Route the dialog through the main thread instead (e.g., a queue the main thread polls) - rejected as needlessly complex and still blocks uvicorn's event loop for as long as the dialog is open, which a subprocess avoids for free. Use a native Win32 COM folder-picker (`IFileDialog`) directly via `ctypes`/`comtypes` - rejected as more code for the same result; PowerShell's WinForms dialog is simpler and already how this project shells out to Windows-native functionality elsewhere.

### Consequences

Same `pick_folder(title, initial_dir=None) -> str | None` signature, so none of the four call sites needed to change. Verified with two real, live end-to-end tests (not just code review) - a Cancel path and a real folder selection - both driven through the exact `asyncio.to_thread` pattern the real routes use, confirming neither crashes. Slightly higher per-call latency (spawning a PowerShell process vs. an in-process Tk root) - not noticeable for an occasional user-initiated Browse click.

### Date

2026-07-14

---

### Decision

The installer no longer deploys a Palworld server during setup. The super admin is instead shown a forced, full-screen prompt (`FirstServerPrompt.tsx`) on login whenever zero server instances are registered, reusing the app's own Deploy/Import flow (TICKET-0132).

### Reason

A real installer-seeded deploy of "Kraken_1_0" left the app showing "No server" despite the server actually being created. Root cause traced to structural fragility in the seeded-deploy mechanism itself, not a one-off bug: it ran as a fire-and-forget `asyncio.create_task()` at app startup (a real SteamCMD download can take minutes, during which `/instances` legitimately returns empty), `Dashboard.tsx` only fetched the active instance once on mount (unlike `TopBar.tsx`, which already knew to re-poll for this reason), and the deploy job's exception handling only caught `SteamCmdError`/`OSError` - anything else could silently kill the background task before the instance was ever registered, with the server folder possibly already downloaded on disk. Rather than hardening this further (broader exception handling, Dashboard polling, etc.), the user asked to remove the fragile mechanism entirely and force server creation through the path that already reliably works: the in-app wizard, synchronously polled by the browser tab that's actually open and waiting.

### Alternatives

Patch the specific gaps found (catch-all exception handling in `_run_deploy`, make `Dashboard.tsx` poll like `TopBar.tsx` does) - rejected by the user in favor of removing the fragile mechanism outright, since a fire-and-forget background deploy with no UI polling it is inherently harder to make fully reliable than a flow the user is actively watching.

### Consequences

`installer.iss` lost `ServerNamePage`/`ServerInstallDirPage` and the now-unused `HasServerData`/`ServerDataExists`; `first_run_setup.py` lost its deploy branch (and an already-dead, pre-existing `nexusApiKey` seed block noticed along the way, unreachable since TICKET-0105's SSO migration). The installer now only ever seeds a super admin account - much less for `[Code]` to get wrong. Every "start using AutoPalExpress" path now converges on the same, already-battle-tested Deploy/Import components regardless of whether the server is created during a "first login" prompt or later from Settings. Verified with the most thorough installer test performed this session: a complete, real, GUI-automated install (every wizard page driven via `SendMessage`/`WM_SETTEXT`, not just a partial run) confirming zero servers are registered afterward and no deploy step appears in the log.

### Date

2026-07-14

---

### Decision

Browsing Nexus Mods from the Mods page is wishlist-only for every role, including the super admin (TICKET-0153). "Direct Install" and the "Install File" shortcut link were removed from that browse dialog's mod cards entirely.

### Reason

Direct explicit user request: neither admins nor the super admin should be able to install a mod straight from the browse dialog - every mod, for every role, should go through the wishlist for the super admin to review and approve.

### Alternatives

Also lock the backend `/from-nexus/{id}/install` route (considered and offered to the user via AskUserQuestion) - declined in favor of a UI-only change, since the wishlist-approve action and Super Admin's own Install From File panel still need the same underlying Premium-key install machinery, and the user only asked about the browse-dialog experience.

### Consequences

This supersedes the "restore Direct Install for super admins" decision from TICKET-0038/0041/0083 above - that convenience is now gone from the Mods page browse flow. The backend direct-install endpoint, the saved Nexus Premium key, and Super Admin's Install From File panel are all still fully intact and reachable outside this dialog; only the browse-dialog's per-card buttons and the now-dead `NexusFilePickerDialog.tsx`/`onModsChanged` plumbing that only existed to support them were removed. If a future ticket wants a super-admin one-click install surface back, it would need to be re-added deliberately rather than assumed still present from this history.

### Date

2026-07-16
