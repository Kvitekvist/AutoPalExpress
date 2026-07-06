# TICKET-0005

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

Follow-up to TICKET-0003: after installing that build, the user reported every other change was visible except the "Remove This Forward" button - it never appeared in either the Remote Access or Share With Friends panel.

## Reason

TICKET-0003 made "Remove" conditional on the backend successfully detecting an existing mapping (`gameMapping`/`adminMapping` from `/network/upnp/status`, backed by `upnp.get_port_mapping()`'s `GetSpecificPortMappingEntry` SOAP call). That query is far less universally supported across consumer router UPnP implementations than `AddPortMapping`/`DeletePortMapping` are - a router can easily support adding/removing a mapping while failing, timing out, or misbehaving on this specific read - and `_mapping_info()` was deliberately written to degrade to `None` on any such failure rather than break the whole status check. The practical effect: on a router where detection doesn't work, the button *never* shows, even though removal itself would work fine (`DeletePortMapping` degrades gracefully to a no-op if there's nothing to delete - UPnP error 714 is already treated as success).

The user's own diagnosis was correct: make sure there are no conditions on showing the button at all.

## Implementation Plan

* [x] `RemoteAccessPanel` and `PortForwardPanel` now always render both "Forward"/"Open Remote Access" and "Remove This Forward" side by side whenever a UPnP-capable router is present, regardless of whether a mapping was detected.
* [x] When a mapping *is* detected, still show the informative text (whose machine holds it); when not, show a short note that detection isn't always reliable and Remove is offered anyway.
* [x] No backend change needed - `_unforward`/`unforward-admin` already no-op safely (UPnP 714) if there's nothing mapped, so an unconditional Remove button can never cause a harmful call.

## Files Modified

* `web/src/components/settings/RemoteAccessPanel.tsx`
* `web/src/components/settings/PortForwardPanel.tsx`

## Testing

* `tsc -b` typechecks clean.
* Reasoned through the backend contract rather than re-testing UPnP mechanics directly (unchanged from TICKET-0003): `delete_port_mapping`/`_unforward` already treat "nothing to delete" (error 714) as success, so removing this button's visibility condition can't introduce a failure mode - worst case is a harmless no-op call.
* Full PyInstaller + Inno Setup rebuild succeeded.

## Result

Both "Forward" and "Remove" are now unconditionally available together wherever a UPnP router is present, independent of whether this tool's mapping-detection query happens to work on the user's specific router.

## Notes

Direct correction to TICKET-0003, reported immediately after that build was installed and reviewed.

## Closed

2026-07-06
