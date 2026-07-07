# TICKET-0021

**Status**

Closed

**Type**

Enhancement

**Priority**

Low

**Created**

2026-07-07

---

## Description

Make it clearer that the Mods page's Nexus browse feature requires the super admin to connect a Nexus Mods API key in the Super Admin panel first.

---

## Reason

Users could click "Browse Nexus Mods" and see a generic setup message that pointed at Settings, even though the Nexus connection now lives under Super Admin and must be configured by the super admin.

---

## Implementation Plan

* [x] Update the Browse Nexus Mods dialog copy.

* [x] Point the disconnected Nexus state to Super Admin.

* [x] Update the Super Admin Nexus panel and README wording.

---

## Files Modified

* `web/src/components/mods/NexusBrowseDialog.tsx`
* `web/src/components/mods/NexusModBrowser.tsx`
* `web/src/components/settings/NexusIntegrationPanel.tsx`
* `README.md`

---

## Testing

* [x] Frontend build/typecheck passes.

---

## Result

The Browse Nexus Mods flow now explicitly says the super admin must connect a Nexus Mods API key in Super Admin before the browse feature is available.

---

## Notes

The expected `memory/` source-of-truth files and `CHANGELOG.md` are not present in this repository, so they could not be updated.

---

## Closed

2026-07-07
