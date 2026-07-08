# TICKET-0028

**Status**

Closed

**Type**

Enhancement

**Priority**

High

**Created**

2026-07-08

---

## Description

Replace Palworld RCON usage with Palworld's official REST API.

---

## Reason

Palworld now documents a REST API for server info, metrics, players, announcements, kick/ban/unban, save, shutdown, and stop. The tool should use that supported API instead of the older Source RCON path.

---

## Implementation Plan

* [x] Add a Palworld REST API client using local HTTP Basic Auth.

* [x] Enable REST API settings for managed servers before launch.

* [x] Replace RCON calls in players, server control, scheduler, and backups.

* [x] Update frontend labels and public docs from RCON to REST API.

* [x] Keep compatibility with existing stored `rconPort` data while treating it as the REST API management port.

---

## Files Modified

`app/services/palworld_rest.py`, server/player/automation routes, scheduler, backup service, Palworld settings handling, deploy UI, README, Nexus description, memory docs, changelog.

---

## Testing

Ran backend compile checks and frontend production build. Verified official Palworld REST API docs for endpoints and requirements. No live destructive kick/ban test was run.

---

## Result

The app no longer imports or uses the RCON client. Game-level actions now use Palworld's local REST API, with local process control retained for starting and cleanup fallback.

---

## Notes

The stored JSON/API field names `rconPort` and `rconReady` remain as compatibility aliases for now. User-facing labels now say REST API.

---

## Closed

2026-07-08
