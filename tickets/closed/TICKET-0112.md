# TICKET-0112

**Status**

Closed

**Type**

Feature

**Priority**

Medium

**Created**

2026-07-13

---

## Description

Add traffic-light status indicators to the Dashboard page (`web/src/pages/Dashboard.tsx`), one per port that needs both a firewall rule and a router forward to actually work for friends: Game Port, Steam Query Port (only when enabled), and the Admin/Remote Access Port. Each light is grey/yellow/red/green, giving an at-a-glance network health check without opening Super Admin's detailed panels.

All the underlying data already exists and is exactly what `PortForwardPanel.tsx`/`RemoteAccessPanel.tsx` already compute for their own detailed views - this is a compact summary of the same checks, not a new backend capability:

* `networkApi.getUpnpStatus()` - `UpnpStatus.available` (router found at all), `gameMapping`/`queryMapping`/`adminMapping` (each `PortMappingInfo | null`, with `isThisMachine`).
* `networkApi.getGameFirewallStatus(port)` / `getFirewallStatus()` (admin port) - whether Windows Firewall currently allows the port.

Proposed color mapping per port (mirrors the existing panels' own logic, condensed to one indicator):

* **Grey (off)**: not applicable right now - no active server instance, or (Steam Query Port specifically) the query port feature is disabled in Launcher Options.
* **Green (working)**: firewall rule exists AND the router mapping is confirmed forwarded to this machine.
* **Yellow (warning)**: firewall rule exists, but forwarding can't be confirmed as fully working - no UPnP router detected (manual forwarding required, can't auto-verify) or the router mapping points at a different machine on the network.
* **Red (error)**: the firewall rule does not exist - the single most actionable "friends will likely see a timeout" state, regardless of forwarding.

---

## Reason

Direct user request: give Super Admin/Dashboard viewers a quick, glanceable summary of "is this actually reachable from outside" per port, instead of needing to open Super Admin and read through each panel's detailed step-by-step status to know whether something's wrong.

---

## Implementation Plan

* [x] New `web/src/components/fantasy/TrafficLight.tsx` - a small colored dot (grey/yellow/red/green, plus a distinct dim pulsing state for "still loading" that isn't one of the four real colors) plus label.
* [x] New `web/src/components/dashboard/NetworkStatusLights.tsx`, rendered on `Dashboard.tsx` right after the top status panel, fetching `networkApi.getUpnpStatus()` plus the game/query/admin firewall-status calls and rendering one `TrafficLight` per port (query port shows grey/off when disabled).
* [x] Applied the proposed color mapping as-is (kept the "firewall OK but can't confirm forwarding = yellow" default called out as worth double-checking - no objection raised).
* [ ] Not implemented: click/hover linking through to the relevant Super Admin panel - kept to the display only, to keep the change scoped; a reasonable small follow-up rather than a blocker.
* [x] No separate polling interval - fetched once on mount, matching that router/network state changes far less often than the 4-second-polled server metrics.
* [x] **Correction to this ticket's own recommendation**: while implementing, found that `/api/network/*` (everything `networkApi.getUpnpStatus()`/firewall-status calls hit) is already `require_super_admin`-gated at the router level in `app/main.py` - not just "visible to every admin" as this ticket assumed. Loosening that boundary to show these lights to regular admins would have been a real access-control change well outside this ticket's scope, so `NetworkStatusLights` is rendered only when `user.role === "super_admin"` instead, matching the existing backend restriction exactly rather than fighting it.

---

## Files Modified

* `web/src/pages/Dashboard.tsx`
* `web/src/components/fantasy/TrafficLight.tsx` (new)
* `web/src/components/dashboard/NetworkStatusLights.tsx` (new)

---

## Testing

* `npx tsc --noEmit` on the frontend - passes with no errors.
* Not tested: an actual browser render of each color state (no interactive desktop/real router in this environment) - the color-selection logic was verified by reading, not observed live.

---

## Result

Dashboard now shows three traffic lights (Game Port, Steam Query Port, Remote Access) for super admins, summarizing the same firewall+forwarding checks Super Admin's detailed panels already do.

---

## Notes

Ticket created per explicit user request; implementation deliberately not started yet. The exact color mapping above is a proposed default, not a final decision - worth a quick sanity check with the user once implementation starts, particularly whether "firewall OK but can't confirm forwarding" should read as yellow (current proposal) or red (more conservative/pessimistic default).

---

## Closed

2026-07-13