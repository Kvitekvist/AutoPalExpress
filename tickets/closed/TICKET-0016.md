# TICKET-0016

**Status**

Closed

**Type**

Enhancement

**Priority**

Medium

**Created**

2026-07-06

---

## Description

When UPnP isn't available (router doesn't support it, or is behind carrier-grade NAT), both the admin panel's Remote Access panel and the game port's Share With Friends panel told the user to "forward it manually in your router" but never said what values to actually enter - name, protocol, internal/external IP, internal/external port.

## Reason

A user without UPnP had no way to know the exact values their router's port-forwarding form needs, especially the machine's own LAN IP, which isn't something most people have memorized. This directly followed from a real live setup where the user needed exactly this information for their own router.

## Implementation Plan

* [x] Added `local_ip` to `/network/upnp/status`'s response (`upnp.local_ip()` - works independent of whether a UPnP router was found, since it's just an outbound-socket trick to find the machine's own LAN IP; wrapped in a try/except for the edge case of no network route at all).
* [x] Added a shared `ManualForwardInstructions` component showing exactly what to enter: Name, Protocol, External IP (`* (any)`), Internal IP (the real local IP), External Port, Internal Port (this app never does port translation, so external/internal port are always the same value).
* [x] Wired it into `RemoteAccessPanel` (TCP, admin port) and `PortForwardPanel` (UDP, game port) for the "no UPnP-capable router found" case.

## Files Modified

* `app/routes/network.py` - added `local_ip` to the status response.
* `web/src/types/models.ts` - added `localIp` to `UpnpStatus`.
* `web/src/components/settings/ManualForwardInstructions.tsx` - new shared component.
* `web/src/components/settings/RemoteAccessPanel.tsx`, `PortForwardPanel.tsx` - use it.

## Testing

Verified `upnp.local_ip()` directly, and the full `/network/upnp/status` endpoint end-to-end via a real HTTP request through the actual app (not mocked) - correctly returned the real local IP (`192.168.0.110`) alongside the real discovered router and external IP on this dev machine's actual network. `tsc -b` typechecks clean.

## Result

Users without UPnP now get the exact values to enter in their router - previously they were told to "forward it manually" with no indication of what that actually means in practice.

## Notes

Directly prompted by the user's own real router setup earlier in this session, where these exact values (name, protocol, internal IP, external/internal port) had to be worked out manually together.

## Closed

2026-07-06
