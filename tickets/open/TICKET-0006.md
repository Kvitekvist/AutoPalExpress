# TICKET-0006

**Status**

Open

**Type**

Bug

**Priority**

High

**Created**

2026-07-06

---

## Description

Kicking a player from the Dashboard's Players roster (RCON `KickPlayer <id>`) completes without error but the player isn't actually disconnected. Confirmed RCON itself is working (Broadcast succeeds against the same server/connection).

## Reason

`rcon._check_result()` only raises an error if Palworld's plain-text response contains the word "failed" - a response that doesn't contain that word is assumed to mean the action succeeded, with no visibility into what the response actually said. That makes a "silently didn't match a real player" outcome indistinguishable from a real success purely by looking at whether an error was raised.

A first, confirmed-real bug was found and fixed on the way: `show_players()` parsed the `name,playeruid,steamid` CSV without stripping whitespace from each field, so if Palworld's output has any stray whitespace, the `steamid` used for `KickPlayer {steamid}` could be silently wrong. This did **not** resolve the reported issue on its own ("still not kicking" after installing that build).

The user then shared their server console's own connection log line: `User id: steam_76561198068686632` - Palworld's own console logs a connecting Steam player with a `steam_` prefix, but `ShowPlayers`' RCON output gives just the bare numeric SteamID64 with no prefix. `KickPlayer`/`BanPlayer`/`UnBanPlayer` most likely require that same `steam_`-prefixed form (matching what the game itself logs) - the bare numeric ID never matching a real connected player would explain the silent no-op exactly.

## Implementation Plan

* [x] Strip whitespace from all three `ShowPlayers` CSV fields in `show_players()`.
* [x] Log the raw RCON response text for every kick/ban/unban call (`logger.info("rcon: %s %s -> %r", ...)`), not just on failure - needed to actually see what Palworld says back, since that's the only way to tell a real success from a silently-ignored command.
* [x] Added `_kick_ban_id()`: prefixes a bare numeric ID with `steam_` before sending to `KickPlayer`/`BanPlayer`/`UnBanPlayer`, matching the format Palworld's own console uses. Left as-is for anything not purely numeric (already prefixed, or a non-Steam `playeruid` fallback), since there's no evidence those need it.
* [ ] Waiting on the user to confirm this actually kicks the player now.

## Files Modified

* `app/services/rcon.py` - `show_players()` field stripping, `_check_result()` unconditional response logging, new `_kick_ban_id()` helper used by `kick_player()`/`ban_player()`/`unban_player()`.

## Testing

Not yet resolvable end-to-end without a live Palworld server and a connected real player to kick (no such environment reachable from this sandboxed dev session). Verified in isolation: `_kick_ban_id()` correctly prefixes a bare numeric SteamID64, leaves an already-prefixed ID unchanged (idempotent), and leaves a non-numeric ID untouched.

## Result

Strong, evidence-based fix applied (matches the exact prefix format the user's own server console uses for the same player), but not yet confirmed against a real kick - keeping open until the user reports back.

## Notes

Close once the user confirms the kick actually works. If it still doesn't, the next data point needed is the logged `rcon: kick <id> -> <raw response>` line from this build.

## Closed

Not closed yet.
