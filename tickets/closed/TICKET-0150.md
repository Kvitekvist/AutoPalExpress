# TICKET-0150

**Status**

Closed

**Type**

Bug

**Priority**

Medium

**Created**

2026-07-14

---

## Description

Removing a server from Settings > Server Instances didn't update the TopBar's "Current Server" dropdown - the deleted server stayed listed there (and selectable) until the browser was manually refreshed. Root cause: `InstanceSwitcher` (TopBar) fetches the instance list only once on mount (polling only while empty, per TICKET-0093) and has no way to know another component just changed it, since each component reads the instance list independently with no shared state or event between them.

---

## Reason

Direct user report: "after i deleted the server from server instances, it didnt remove from the current_server drop down. I did a cache refresh on the browser and it went away. so i think doing the delete should force such a refresh."

---

## Implementation Plan

* [x] `web/src/components/settings/InstanceManagerPanel.tsx`: `handleRemove()` now calls `window.location.reload()` after a successful remove/delete, exactly matching the existing `handleSwitch()` in the same file (and in `TopBar.tsx`'s `InstanceSwitcher`) - both already reload for the identical reason ("every page reads the instance list independently on mount"), so this makes removal consistent with the pattern already established for switching the active server rather than introducing a new cross-component sync mechanism.

---

## Files Modified

* `web/src/components/settings/InstanceManagerPanel.tsx`

---

## Testing

* Confirmed via `app/services/instance_store.py:remove_instance()` that the backend already correctly reassigns `activeId` to a remaining instance (or `null`) when the removed instance was active, so the only real gap was the frontend's stale cached list in a different component - not a backend/data-consistency issue.
* `npx tsc --noEmit` and `npm run build` pass.
* Not tested through a real live browser session (no interactive desktop in this sandbox) - the fix mirrors an already-proven-working pattern (`handleSwitch`) in the exact same file, so its mechanism is not new or unverified.

---

## Result

Deleting or unregistering a server now refreshes the whole app immediately, so the TopBar's server switcher (and every other page reading the instance list) reflects the removal right away instead of requiring a manual browser refresh.

---

## Closed

2026-07-14
