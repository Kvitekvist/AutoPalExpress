# TICKET-0069

**Status**

Closed

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

* [x] Added a per-instance `queryPort` value in `instances.json`, defaulting to that instance's own `gamePort` - already guaranteed unique across this tool's instances, so it solves the collision problem with zero action required from existing single-instance hosts. `_dedupe_data()` migrates any instance created before this field the same way.
* [x] `process_manager.py`: appends `-queryport={queryPort}` right after `-port={gamePort}` in the launch args.
* [x] Super Admin UI: added a "Steam Query Port" field to `PortForwardPanel.tsx` (Super Admin's "Share With Friends" panel), editable and saved via a new super-admin-only `POST /api/instances/{id}/query-port` endpoint - same gating precedent as the other launch-option mutations.
* [x] Extended UPnP/firewall forwarding: `app/routes/network.py`'s `/upnp/status` now also reports `queryPort` and `queryMapping` (reusing the existing generic `_mapping_info` helper). The existing "Allow Through Firewall" / "Forward Port" / "Remove This Forward" actions now transparently also cover the query port whenever it's been set to a different value than the game port (most hosts running one server never notice this - it's a no-op duplicate when the two ports are equal, which is the default). When no UPnP router is available, a second `ManualForwardInstructions` block appears for the query port specifically, but only when it actually differs from the game port.
* [x] Migration-safe default: confirmed live against the project's real `Tester1` test instance, which predated this field - `_dedupe_data()` correctly backfilled `queryPort` to match its existing `gamePort` (8212) with no user action.
* [x] README/GETTING_STARTED weren't changed - neither documents a specific list of ports to manually forward today, so there was nothing to update.

---

## Files Modified

* `app/services/instance_store.py` - `queryPort` field, `_dedupe_data()` migration, `update_query_port()`.
* `app/routes/instances.py` - `queryPort` in `_instance_view()`, new `POST /{instance_id}/query-port` endpoint.
* `app/services/process_manager.py` - `-queryport=` launch arg.
* `app/routes/network.py` - `queryPort`/`queryMapping` in `/upnp/status`.
* `web/src/types/models.ts` - `ServerInstance.queryPort`, `UpnpStatus.queryPort`/`queryMapping`.
* `web/src/api/instancesApi.ts` - `setQueryPort()`.
* `web/src/components/settings/PortForwardPanel.tsx` - Steam Query Port field, extended firewall/forward actions.
* `web/src/i18n/locales/{zh-Hans,ja,de,fr,es}.json` - new `superAdmin.portForward.*` query-port keys.

---

## Testing

Manual, against the real running dev backend and the project's real `Tester1` Palworld server instance (no automated test suite exists, see `.claude/memory/tech_stack.md`):

* `npm run build` passed clean.
* Restarted the dev backend fully (not just relying on `--reload`, per the gotcha found in TICKET-0067) before verifying.
* Called `instance_store.update_query_port()` directly against the real `Tester1` instance and confirmed via `instance_store.get()` that `queryPort` persisted independently of `gamePort`.
* Confirmed via a real HTTP request (`GET /api/instances/active`) that the API correctly returns the updated `queryPort`.
* Confirmed via a real HTTP request that a regular (non-super-admin) account gets 403 from `POST /api/instances/{id}/query-port` - the gating works.
* Called `network.upnp_status()` directly (its router is super-admin-gated at the FastAPI level, so a plain HTTP call from a test account 403s as expected) and confirmed it returns the correct `queryPort` and a `queryMapping` of `None` in this sandbox (no real router present, same as `gameMapping`) without crashing.
* Reverted the test instance's `queryPort` back to match `gamePort` afterward and removed the throwaway test account/invite, leaving no test residue.
* Not done: actually starting the real Palworld server process with the new `-queryport=` flag and confirming Steam's server browser picks it up - that requires a live multi-instance setup with two servers running simultaneously and checking Steam's own UI, which is out of scope for this sandbox's automated verification.

---

## Result

AutoPalExpress now exposes a per-instance Steam query port, defaulting sensibly to the instance's own game port (already unique per instance), configurable independently in Super Admin, passed to Palworld via `-queryport=`, and covered by the same firewall/UPnP forwarding flow as the game port whenever it's set to a distinct value.

---

## Notes

Still low priority in the sense that most hosts running a single Palworld server will never need to touch this - the default (query port = game port) already avoids the collision problem for them. It only becomes relevant once someone runs two or more Palworld servers on the same machine/IP and wants each to show correctly in Steam's server browser.

---

## Closed

2026-07-10
