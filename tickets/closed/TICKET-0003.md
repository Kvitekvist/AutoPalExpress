# TICKET-0003

**Status**

Closed

**Type**

Bug

**Priority**

Medium

**Created**

2026-07-06

---

## Description

There was no reliable way, from within the tool, to remove a UPnP port mapping that wasn't created by the current browser session - which matters because the user's router's own web UI can't remove UPnP-added mappings at all. Reported directly after diagnosing a related issue: the client PC and a new dedicated server machine are on the same home network/router, and the client's earlier UPnP forward of the admin port (8000) was still occupying that port on the router, silently redirecting the public IP back to the client PC instead of the server.

## Reason

The backend's `unforward` / `unforward-admin` endpoints already worked correctly regardless of which machine originally created a mapping - UPnP's `DeletePortMapping` only needs the external port and protocol, not the original owner. The actual gap was entirely in the frontend: `RemoteAccessPanel` and `PortForwardPanel` each tracked a `forwarded` boolean as local React state (`useState(false)`), set to `true` only after a successful forward call *in that same session*. On every page load - or when checking from a different machine, or after the mapping was created earlier or by someone else - that state reset to `false`, so the UI only ever offered "Forward" (add), never "Remove," even when a mapping genuinely existed and could be removed right there.

## Implementation Plan

* [x] Add `upnp.get_port_mapping()` using the `GetSpecificPortMappingEntry` SOAP action, returning the router's actual current mapping (internal client/port/description) for a given external port+protocol, or `None` if nothing's mapped there (UPnP error 714).
* [x] Add `network._mapping_info()`, wrapping that call for `/network/upnp/status` - degrades to `None` (not a hard failure) if the router errors on this specific query, since `AddPortMapping`/`DeletePortMapping` support doesn't guarantee `GetSpecificPortMappingEntry` support.
* [x] `/network/upnp/status` now returns `gameMapping` and `adminMapping`, each `{internalClient, isThisMachine, description} | null` - `isThisMachine` compares against `upnp.local_ip()`.
* [x] `RemoteAccessPanel` and `PortForwardPanel` now derive their forwarded/removable state from these real mapping fields instead of local-only state, and re-fetch status after every forward/unforward action instead of just flipping a local flag.
* [x] When a mapping exists but points at a different machine, both panels now say so explicitly (showing that machine's LAN IP) and offer "Remove This Forward" regardless of who created it - directly solving "the router won't let me remove a UPnP entry, and neither did this tool until now."

## Files Modified

* `app/services/upnp.py` - added `get_port_mapping()`.
* `app/routes/network.py` - added `_mapping_info()`, extended `/upnp/status` response.
* `web/src/types/models.ts` - added `PortMappingInfo`, extended `UpnpStatus`.
* `web/src/components/settings/RemoteAccessPanel.tsx` - derives state from `adminMapping`, shows which machine holds it.
* `web/src/components/settings/PortForwardPanel.tsx` - same, for `gameMapping`.

## Testing

No automated test suite in this project - verified via targeted scripts against mocked SOAP responses (no UPnP gateway reachable from this sandboxed dev session to test against a real router directly):

* Parsed a realistic `GetSpecificPortMappingEntryResponse` correctly into `{internalClient, internalPort, description}`.
* UPnP error 714 (`NoSuchEntryInArray`) correctly returns `None` rather than raising.
* Any other UPnP error still propagates (not silently swallowed).
* `_mapping_info()` correctly flags `isThisMachine` both ways (matching and non-matching local IP), returns `None` for no mapping, and degrades to `None` without crashing the whole status call if the router errors on this specific query.
* `tsc -b` typechecks clean after removing the local-only `forwarded` state from both panels.
* Full PyInstaller + Inno Setup rebuild succeeded with the change included.

## Result

Either panel can now show and remove a port mapping regardless of which machine created it or when - including the exact scenario that prompted this: a stale mapping pointing at another PC on the same network, which the router's own admin page couldn't remove.

## Notes

Direct follow-up to the port-forwarding investigation that also produced TICKET-0001/0002.

## Closed

2026-07-06
