# TICKET-0114

**Status**

Closed

**Type**

Enhancement

**Priority**

Low

**Created**

2026-07-13

---

## Description

Move "Import Save" (TICKET-0104) from Settings > Automation up to Settings > Server Instances, and give it a purple outline (the app's existing `arcane` accent color, `#9560ef`/`#b18af8` in `web/src/index.css` - already used elsewhere for a "magic" accent distinct from the panel's existing `gold`/`mana` buttons).

Currently:

* `web/src/components/settings/AutomationPanel.tsx` renders the "Import Save" button (`variant="ghost"`) next to "Backup Now," opening `SaveImportDialog`.
* `web/src/components/settings/InstanceManagerPanel.tsx`'s header already has "Import Existing" (`variant="mana"`) and "Deploy New Server" (`variant="gold"`) - both instance-management actions.

Since Import Save is really about a server instance's save data (like importing or deploying a server), it fits better grouped with those two than under Automation's backup-scheduling controls.

---

## Reason

Direct user request: relocate for better information architecture (instance-management actions grouped together), plus a distinct color so it doesn't blend in with the panel's other two header buttons.

---

## Implementation Plan

* [x] Removed the "Import Save" button and `SaveImportDialog` state from `AutomationPanel.tsx`; `refreshBackups` stayed (still used by the initial load and "Backup Now").
* [x] Added "Import Save" to `InstanceManagerPanel.tsx`'s header `actions`, `variant="arcane"` (purple outline), opening the same `SaveImportDialog` unchanged.
* [x] `SaveImportDialog`'s `onImported` callback is now a no-op on Server Instances - nothing on that panel needs refreshing after an import (the instance list itself doesn't change), and the dialog already shows its own success toast. The Automation page's backup list will simply pick up the pre-import snapshot next time it's viewed.

---

## Files Modified

* `web/src/components/settings/AutomationPanel.tsx`
* `web/src/components/settings/InstanceManagerPanel.tsx`

---

## Testing

* `npx tsc --noEmit` on the frontend - passes with no errors.
* Not tested: an actual browser click-through (no interactive desktop in this environment) - the dialog component itself is unchanged, only its mount location and button color moved.

---

## Result

Import Save now lives in Settings > Server Instances' header, styled with the `arcane` (purple) accent, no longer under Automation.

---

## Notes

Ticket created per explicit user request; implementation deliberately not started yet.

---

## Closed

2026-07-13