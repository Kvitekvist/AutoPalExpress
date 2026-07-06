# TICKET-0004

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

Follow-up UI reorganization requested after TICKET-0003: consolidate server-machine-specific information and the game port control into the Super Admin page (already restricted to the super admin role), remove the port field from World Settings so there's exactly one place to change it, and clean up a panel the user wasn't sure was doing anything real.

## Reason

* The Dashboard showed the active instance's on-disk server path to every logged-in user (regular admins included), not just the super admin - machine-local filesystem detail that arguably shouldn't be visible to friend-admins at all.
* World Settings exposed a "Game Port" field (`PublicPort`) alongside every other generic `.ini` setting, which was the second of two places a server's port could be changed (see TICKET-0001) - even after TICKET-0001 made both paths *consistent*, having two editable places was still the underlying complaint.
* `ServerConnectionPanel` ("Server Connection" in Settings) turned out to be entirely mock UI investigated on request - `connectionApi.ts` only simulated delays against an in-memory object, and grep confirmed no `/connection` route exists anywhere in the backend. Leftover from before this app had real multi-instance + RCON support. Confirmed with the user (dead-panel question) that removal, not relocation, was wanted.

## Implementation Plan

* [x] Removed the "instance name + disk path" block from `Dashboard.tsx`; added an "Active Server" info panel (name + path) to `SuperAdmin.tsx` instead - now only visible to the super admin, matching that page's existing role gate.
* [x] Added `_MANAGED_ELSEWHERE = {"PublicPort"}` to `palworld_settings.py`; `read_all_settings()` now skips it, so it no longer appears in World Settings. `write_settings()` is untouched and still accepts it directly - the dedicated Super Admin control uses that same write path, just not through the generic settings list. Removed the now-unreachable `PublicPort` entry from `POPULAR_FIELDS`.
* [x] `PortForwardPanel`'s "Game Port" field (Super Admin -> Share With Friends) is now the actual, authoritative port editor: shows the real configured port, and a "Save Port" button persists it via the same `serverSettingsApi.updateSettings({PublicPort})` call World Settings used to make, syncing `instances.json` automatically (unchanged backend behavior from TICKET-0001). This is now the one and only place to change a server's game port.
* [x] Removed `ServerConnectionPanel.tsx`, `connectionApi.ts`, the `ServerConnection`/`DiscoveredServer` types, and `mockDiscoveredServers` - all dead/mock code with no real backend, per the user's choice on the dead-panel question.

## Files Modified

* `web/src/pages/Dashboard.tsx` - removed disk-path block, unused `HardDrive` import.
* `web/src/pages/SuperAdmin.tsx` - added "Active Server" info panel.
* `web/src/pages/Settings.tsx` - removed `ServerConnectionPanel`.
* `web/src/components/settings/PortForwardPanel.tsx` - Game Port field now saves the real port (not just a forward-target override); removed the old `portTouched`/"auto-detected vs manually set" concept since it no longer applies.
* `web/src/components/settings/ServerConnectionPanel.tsx` - deleted.
* `web/src/api/connectionApi.ts` - deleted.
* `web/src/api/index.ts`, `web/src/api/mockData.ts`, `web/src/types/models.ts` - removed now-dead exports/types.
* `app/services/palworld_settings.py` - `_MANAGED_ELSEWHERE`, `read_all_settings()` filter, removed dead `PublicPort` entry from `POPULAR_FIELDS`.

## Testing

* `read_all_settings()` verified against a real dev-machine ini (107 fields, `PublicPort` confirmed absent); `write_settings()` verified to still accept `PublicPort` directly afterward.
* `tsc -b` typechecks clean after all removals (confirms no dangling references to the deleted panel/API/types).
* `app.main` imports cleanly.
* Full PyInstaller + Inno Setup rebuild succeeded.

## Result

Super Admin (role-gated) is now the single place for: the active server's disk path, the game port (view + edit + save), and port-forward management (view/add/remove, from TICKET-0003) for both the admin panel and game ports. World Settings no longer shows or can edit the port. Removed a non-functional, confusing panel instead of relocating dead functionality.

## Notes

Direct follow-up to TICKET-0001/0002/0003's port-management work, prompted by the user reviewing the resulting UI after installing the TICKET-0003 build.

## Closed

2026-07-06
