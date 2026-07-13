# TICKET-0121

**Status**

Closed

**Type**

Enhancement

**Priority**

Medium

**Created**

2026-07-13

---

## Description

`LauncherFlags.tsx` ("Host Control" -> "Launcher Options") blocks its entire body behind a single full-page loading state: while `instancesApi.getActive()` and `networkApi.getUpnpStatus()` are in flight, `!loaded` is true and the page renders only a centered "Loading launcher options..." message - none of the option cards (Community Server, Perf Threads, Async Loading Thread, Multithread For DS, Public IP, Public Port, Query Port) appear until both calls resolve.

User wants the same pattern already used for `RemoteAccessPanel.tsx`/`PortForwardPanel.tsx` (TICKET-0111): show the real card structure (`ScrollPanel`, section labels, toggle labels/descriptions) immediately, and only skeleton-load the parts that actually depend on the network responses (current toggle states, Super Admin public IP/port values, query port value).

---

## Reason

Direct user request: "the host control - Launcher options, is also slow loading. can we show all the cards there and just let them load with content" - same jarring-blocking-load complaint as TICKET-0111, just on a different page that wasn't covered by that ticket.

---

## Implementation Plan

* [x] Drop the `!loaded` full-page early return in `LauncherFlags.tsx`; render the `ScrollPanel` and all cards unconditionally once an instance is selected (or known not to be).
* [x] Use the existing `Skeleton` component (`web/src/components/fantasy/Skeleton.tsx`) to stand in for toggle checked-state and the read-only Public IP/Public Port/Query Port input values while `!loaded`.
* [x] Keep the `!instance` ("Select a server...") state as-is once loading has actually finished.
* [x] Verify with `npx tsc --noEmit`.

---

## Files Modified

* `web/src/pages/LauncherFlags.tsx`

---

## Testing

* `npx tsc --noEmit` - passes with no errors.
* Not tested: an actual browser render (no interactive desktop in this environment) - verified by reading the resulting conditional structure.

---

## Result

While `instance` hasn't loaded yet, the page now shows the `ScrollPanel` shell with 7 skeleton cards matching the real grid's shape (4 compact toggle cards + 3 wider cards with an input placeholder), instead of a blank centered spinner. Once data resolves, the real cards replace them with no layout jump. The "select a server" message still only appears after loading has actually finished and no instance exists.

---

## Notes

Follows the same skeleton-loading convention established in [[TICKET-0111]].

---

## Closed

2026-07-13
