# TICKET-0111

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

Two related Super Admin UI polish requests:

**1. Skeleton loading instead of sudden card expansion**

`RemoteAccessPanel.tsx` ("Remote Access") and `PortForwardPanel.tsx` ("Share With Friends") both wait on `networkApi.getUpnpStatus()` (public IP/router lookup) before rendering their real content:

* `RemoteAccessPanel.tsx` line 97: `if (!status) return null;` - the entire card (icon, title, description) doesn't render at all until the network call resolves, so it pops into existence fully-formed.
* `PortForwardPanel.tsx` line 194: while `!status`, the `ScrollPanel` (title/icon) does render, but the body is a single `"Looking up your public address..."` line - then once `status` arrives, the body suddenly expands into the full multi-section layout (Game Port field, Your Address, "1. Windows Firewall", "2. Router Port Forward").

User wants both panels to show their real structure (title, section labels like "1. Windows Firewall"/"2. Router Port Forward", field labels) immediately, with a loading indicator standing in for just the actual data values (address, mapping status, firewall check result) until they arrive - so the card's size/shape doesn't jump once the network call resolves.

**2. Static "Enable or Disable" toggle text**

Every boolean field's toggle box (`LocalApiSettingsPanel.tsx`'s `LocalApiField` and `WorldSettings.tsx`'s `FieldControl` - both use the same `worldSettings.chrome.enable`/`worldSettings.chrome.disable` translation keys) currently shows dynamic text that flips with the toggle's state: `"Disable"` when currently on, `"Enable"` when currently off. User wants this text static - always literally `"Enable or Disable"` - regardless of the toggle's current position, since the switch itself already shows the state visually.

---

## Reason

Direct user request. On (1): sudden layout shift when a background network call resolves reads as jarring/broken, even though it's just normal loading. On (2): the current text describes what clicking the toggle would do next (`"Disable"` when on), which changes on every click - the user finds that unnecessary noise since the switch position already communicates the state, and wants one constant label instead.

---

## Implementation Plan

* [x] `RemoteAccessPanel.tsx`: dropped the `if (!status) return null` early exit. New shared `web/src/components/fantasy/Skeleton.tsx` (`animate-pulse` bar) stands in for the firewall check result and the address box/mapping status/buttons while `status`/`firewallOk` are still `null` - the "1. Windows Firewall"/"2. Router Port Forward" labels and description render immediately regardless. Also fixed a related gap noticed while doing this: `firewallOk === null` (still loading) was previously falling into the same branch as "confirmed not allowed," misleadingly showing "Not allowed yet" before the check had even run - now shows the skeleton instead until it's actually known.
* [x] `PortForwardPanel.tsx`: replaced the single-line `!status` loading message with skeleton rows under each real section label (Game Port, Your Address, 1. Windows Firewall, 2. Router Port Forward). Left `!hasInstance`/`hasInstance === null` untouched, as planned.
* [x] Placeholder pattern: new `Skeleton` component, a simple `animate-pulse` bar sized per call site to roughly match the real content it stands in for - shared by both panels.
* [x] `LocalApiSettingsPanel.tsx`'s `LocalApiField` and `WorldSettings.tsx`'s `FieldControl`: `EnchantedToggle`'s `label` is now the static `t("worldSettings.chrome.enableOrDisable", { defaultValue: "Enable or Disable" })` in both places - added as a new key rather than repurposing `enable`/`disable`, since those two still exist independently (only their dynamic *use* as a toggle label was the problem).
* [x] Confirmed via search: only these two files used the `chrome.enable`/`chrome.disable` keys as a toggle label; no other toggle in the app has the same dynamic-text pattern.

---

## Files Modified

* `web/src/components/fantasy/Skeleton.tsx` (new)
* `web/src/components/settings/RemoteAccessPanel.tsx`
* `web/src/components/settings/PortForwardPanel.tsx`
* `web/src/components/settings/LocalApiSettingsPanel.tsx`
* `web/src/pages/WorldSettings.tsx`

---

## Testing

* `npx tsc --noEmit` on the frontend - passes with no errors.
* Not tested: an actual browser render of the loading states (no interactive desktop/network throttling in this environment) - logic was verified by reading the resulting conditional structure carefully rather than visually.

---

## Result

Both panels now render their real labels immediately and only skeleton-load the data-dependent parts, so the card size is stable from first paint. Every boolean toggle across World Settings and Local API Settings now reads a static "Enable or Disable" regardless of state.

---

## Notes

Ticket created per explicit user request; implementation deliberately not started yet.

---

## Closed

2026-07-13