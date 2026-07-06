# TICKET-0001

**Status**

Closed

**Type**

Bug

**Priority**

High

**Created**

2026-07-06

---

## Description

A server started through the tool could come up on the wrong game port. Reported live: a server was created/configured for port 8213, but the tool launched it on 8211 instead.

## Reason

Two independent copies of "what port is this server on" existed and could disagree:

* `instances.json`'s stored `gamePort` field (set once, at instance creation/deploy time).
* The live `PalWorldSettings.ini`'s `PublicPort` field, which is what the World Settings page's "Game Port" field actually edits.

`process_manager.start()` launched `PalServer.exe` with `-port={instance['gamePort']}` unconditionally, so once a port was changed via World Settings (which only touches the ini), the next launch used the stale stored value instead. `network.py` already resolved the port from the ini first (with the stored value only as a fallback) for firewall/UPnP port-forwarding purposes - `process_manager` had never been updated to match.

Following user feedback that this was a symptom of a deeper "two places to edit the same thing" problem, this was pushed further than a simple read-fallback fix: the port is now edited in exactly one place (World Settings), and starting a server actively *enforces and syncs* the port rather than just resolving a read. See TICKET-0002 for a related latent parsing bug this surfaced.

## Implementation Plan

* [x] Add `palworld_settings.effective_game_port()` (ini wins, else stored fallback) and use it from `network.py` (dedup of existing `_resolve_port` logic).
* [x] Add `palworld_settings.enforce_game_port()` - same resolution, but writes the fallback into the ini if it has no `PublicPort` field yet (self-heals servers imported from outside this tool).
* [x] `process_manager.start()` now calls `enforce_game_port()` and syncs the resolved value back into `instances.json` via a new `instance_store.update_game_port()` if it changed.
* [x] `server_settings.update_settings()` now calls `instance_store.update_game_port()` immediately whenever `PublicPort` is part of the update, so the stored value can't go stale between edits and the next launch.

## Files Modified

* `app/services/palworld_settings.py` - added `effective_game_port()`, `enforce_game_port()`, extracted `_read_ini_or_template_text()` / `_write_option_body()` helpers (also used by `initialize_settings()`).
* `app/services/process_manager.py` - launches with the enforced/synced port instead of the raw stored `gamePort`; log line now includes the port used.
* `app/services/instance_store.py` - added `update_game_port()`.
* `app/routes/server_settings.py` - syncs `instances.json` when `PublicPort` is edited.
* `app/routes/network.py` - `_resolve_port()` now delegates to the shared `effective_game_port()` helper instead of duplicating the same logic.

## Testing

No automated test suite in this project (manual/live verification is the established pattern - see `memory/tech_stack.md`). Verified via targeted scripts against both synthetic fixtures and real dev-machine server installs:

* Fresh instance with no ini/template at all -> `enforce_game_port()` creates the ini with the fallback port, no malformed output.
* Existing ini with `PublicPort` already set -> that value wins over a different fallback, unchanged on repeated calls (idempotent, no duplicate fields).
* Reproduced the exact reported scenario (ini says 8213, stored `gamePort` stale at 8211) -> resolves to 8213.
* `initialize_settings()` still produces correct output after the refactor, verified against a real `DefaultPalWorldSettings.ini`-shaped template.
* Full `write_settings()` / `read_all_settings()` round-trip against a real, live ~100-field `PalWorldSettings.ini` copied from a dev-machine server - every untouched field byte-for-byte unchanged after editing `Difficulty`, `PublicPort`, and `ServerPlayerMaxNum`.
* `app.main` imports cleanly (no circular imports from the new `instance_store` <-> `process_manager` dependency).
* Full PyInstaller + Inno Setup rebuild succeeded with the fix included.

## Result

Server launches now always use the same port that's live in the ini, and that ini is guaranteed to have a `PublicPort` field going forward even for servers that were imported without one. `instances.json`'s `gamePort` is kept in sync as a side effect of both editing (World Settings) and launching, so it no longer silently drifts from what's actually running.

## Notes

Surfaced TICKET-0002 (a latent bug in the ini field parser) while testing the self-heal path.

## Closed

2026-07-06
