# TICKET-0069

**Status**

Open

**Type**

Feature

**Priority**

Low

**Created**

2026-07-10

---

## Description

Add a Steam query port option for the Palworld dedicated server, exposed on the Super Admin page (Network section, alongside the existing game port / Local API port management).

Palworld's dedicated server accepts a `-queryport=<port>` launch argument that controls the port used only for Steam's server-browser/A2S query protocol (server list pings, player count/name in Steam's UI) - separate from the actual game port (`-port=`) players connect through. Today `process_manager.py` never sets `-queryport`, so Palworld falls back to its own default, which can collide across multiple Palworld servers hosted on the same machine/IP - exactly the setup AutoPalExpress's multi-instance support enables.

---

## Reason

A user commented (on a public post/review) that AutoPalExpress could use a query-port option to designate the Steam query port, and asked whether this already exists. Confirmed via code search that it does not: no `-queryport` argument is built in `process_manager.py`, no `QueryPort` field exists in `palworld_settings.py`'s curated metadata, and `network.py` only forwards the game port (UDP) and the admin panel's own port (TCP) - no third port.

---

## Implementation Plan

* [ ] Add a per-instance `queryPort` value (likely stored in `instances.json` next to `gamePort`/`rconPort`, defaulting to something sane - e.g. the game port, or Palworld's own default - since existing single-instance users shouldn't need to do anything to keep working).
* [ ] `process_manager.py`: append `-queryport={queryPort}` to the launch args (`app/services/process_manager.py` around the existing `-port=`/`-publicport=` construction).
* [ ] Super Admin UI: add a "Steam Query Port" field to the Network/port section, editable like the existing game port field, super-admin-only (same gating precedent as game port / Local API settings).
* [ ] Extend UPnP/firewall forwarding (`app/routes/network.py`) to optionally forward the query port (UDP) alongside the game port, so multi-instance hosts don't have to do it manually.
* [ ] Decide + document the default query port strategy for existing instances that predate this field (migration-safe default, not a breaking change for already-running servers).
* [ ] Update README/GETTING_STARTED if the manual port-forwarding instructions need a third port mentioned.

---

## Files Modified

* (pending implementation)

---

## Testing

(pending implementation - manual verification against a real Palworld dedicated server per this project's live-testing convention, ideally with two instances running simultaneously to confirm the query-port collision problem this solves)

---

## Result

(pending)

---

## Notes

Low priority since it only matters for hosts running multiple Palworld servers off one machine/IP and wanting each to show correctly in Steam's server browser - single-instance hosts are unaffected either way.

---

## Closed

