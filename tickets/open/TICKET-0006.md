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

A first, confirmed-real bug was found and fixed on the way: `show_players()` parsed the `name,playeruid,steamid` CSV without stripping whitespace from each field, so if Palworld's output has any stray whitespace, the `steamid` used for `KickPlayer {steamid}` could be silently wrong. This did **not** resolve the reported issue on its own ("still not kicking" after installing that build), so the true root cause is still unconfirmed - remaining live hypotheses, roughly in order of likelihood:

* Palworld's `KickPlayer` may actually expect the `playeruid` rather than the `steamid` in this game version (community documentation on this is inconsistent across Palworld versions) - `player_id` as currently threaded through from the frontend is whichever of the two `player_history.py` used as the roster key (steamid, falling back to playeruid only if steamid was empty).
* The kicked player's client may be silently reconnecting before the next roster poll, making a real kick look like it did nothing.

## Implementation Plan

* [x] Strip whitespace from all three `ShowPlayers` CSV fields in `show_players()`.
* [x] Log the raw RCON response text for every kick/ban/unban call (`logger.info("rcon: %s %s -> %r", ...)`), not just on failure - needed to actually see what Palworld says back, since that's the only way to tell a real success from a silently-ignored command.
* [ ] Waiting on the user to reproduce a kick against the real server with this logging in place and share the resulting log line, to confirm whether the response indicates success (pointing at a UID-vs-SteamID mismatch) or an unrecognized-command/ID message.
* [ ] Depending on that result: likely fix is passing `playeruid` instead of (or as a fallback alongside) `steamid` to `KickPlayer`/`BanPlayer`/`UnBanPlayer`.

## Files Modified

* `app/services/rcon.py` - `show_players()` field stripping, `_check_result()` unconditional response logging.

## Testing

Not yet resolvable without a live Palworld server and a connected real player to kick (no such environment reachable from this sandboxed dev session) - the fixes so far are verified-safe improvements (stripping cannot break anything; logging is inert unless the log is read), but do not have confirmed root-cause verification yet.

## Result

Not yet fixed. Diagnostic groundwork in place; needs the user's next test + log output to identify the actual cause.

## Notes

Keep open until the user confirms either (a) the kick now works, or (b) shares the logged RCON response so the actual fix (likely UID vs SteamID) can be applied with confidence instead of guessed.

## Closed

Not closed yet.
