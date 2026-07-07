# TICKET-0020

**Status**

Closed

**Type**

Feature

**Priority**

Medium

**Created**

2026-07-07

---

## Description

Replaced the mocked Logs page with a real activity feed: server start/stop, player join/leave, kick/ban/unban, and scheduled backup/restart events - all real, all persisted, all live in the admin panel.

## Reason

Follow-up to TICKET-0019. The user asked to see "the logs that were in the old cmd windows" in the admin panel. Investigating further (see below) found an even more fundamental blocker than TICKET-0019 already knew about, so the deliverable pivoted - confirmed with the user via AskUserQuestion - from "the old console's literal text" (not achievable) to "a real activity log built from what this app already knows about or does" (achievable, and arguably more useful: structured events instead of raw engine spam).

## Investigation

TICKET-0019 had already ruled out stdout capture and log files. This ticket went one step further and found *why* no log file ever appears: `Pal/Saved/Config/WindowsServer/ImGui.ini` exists on the real test server install, confirming Palworld's dedicated server renders its console using **Dear ImGui** - a GPU-rendered overlay (like a game HUD), not a real Win32 text console. There is no text buffer anywhere to read; what appeared in that window was pixels drawn by the graphics engine. The only remaining options (screen-capture OCR, or scanning the game's process memory for ImGui's internal text buffers) were judged unreliable and inappropriate to build against a third-party game process, so they weren't attempted. Presented this finding to the user directly, with a concrete, achievable alternative, before writing any code.

## Implementation Plan

* [x] `app/services/activity_log.py` (new): `log(level, source, message)` / `get_all()`. Persisted as JSON Lines (`data_dir()/activity_log.jsonl`) so history survives an app restart, not just kept in memory - capped at 2000 entries in memory, with the file itself trimmed back down once it exceeds ~2MB.
* [x] `app/routes/logs.py` (new): `GET /api/logs`, returns newest-first, registered in `main.py` under `_authed` (any logged-in admin, matching the Logs page's existing visibility).
* [x] `app/services/process_manager.py`: logs on server start, clean stop, and force-kill (with the instance's name, not just its id).
* [x] `app/services/scheduler.py`: logs scheduled backup completion/failure and scheduled restart start/failure. Player join/leave logging was **decoupled from the `joinLeaveMessages` automation toggle** - that toggle now only controls whether an in-game chat broadcast is *also* sent; an admin who doesn't want "X has entered the realm" spam in-game can still see join/leave activity in their own Logs page.
* [x] `app/routes/players.py`: kick/ban/unban now log who did it (the acting admin's username, via `Depends(get_current_user)`) and to whom (the player's display name, via a new `player_history.get_name()` helper).
* [x] Frontend: `logsApi.ts` now calls the real endpoint instead of `mockData.ts`'s `generateMockLogs` (removed, now dead - it already just returned `[]`, was never actually generating fake data at the time this ticket started). `exportLogs()` is now synchronous, building the text export directly from the already-fetched log list client-side rather than a separate mock async call. `Logs.tsx` updated for the one call-site's new (synchronous) signature. No other page changes needed - the existing search/filter/auto-refresh UI just works against real data now.

## Files Modified

* `app/services/activity_log.py` (new), `app/routes/logs.py` (new)
* `app/main.py`, `app/services/process_manager.py`, `app/services/scheduler.py`, `app/routes/players.py`, `app/services/player_history.py`
* `web/src/api/logsApi.ts`, `web/src/api/mockData.ts`, `web/src/pages/Logs.tsx`

## Testing

* `activity_log.log()`/`get_all()` round-tripped directly: correct newest-first ordering, and correct persistence across a simulated restart (fresh module import against the same data directory).
* `GET /api/logs` tested end-to-end via a real authenticated HTTP request (empty list, then populated after a real `log()` call).
* Ran a real start/stop cycle against the actual `TestServer1` instance through the real integrated `process_manager.start()`/`stop()` functions (not a mock) - confirmed real "Server started" and "force-killed" entries appeared, exactly matching what actually happened (a 10s test timeout wasn't long enough for a graceful shutdown, so the already-known force-kill path fired and was correctly logged as a warning). Verified no processes were left running afterward.
* `tsc -b` clean; full installer rebuild succeeded.

## Result

The Logs page now shows real activity - not Palworld's own console text (confirmed technically unreachable - it's rendered, not logged), but real server lifecycle, player activity, admin actions, and automation events, persisted across restarts.

## Closed

2026-07-07
