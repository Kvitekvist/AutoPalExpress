# TICKET-0009

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

Security audit finding: any authenticated user, including a regular invited friend-admin (not just the super admin), could register an arbitrary folder anywhere on the host machine as a managed "server instance" (`POST /api/instances/import` only checked that the folder contained `PalServer.exe`, not *where* it was), set the mods folder override to any existing directory (`POST /api/mods/mods-path`, same issue), deploy a brand-new server via SteamCMD to any path, or remove any registered instance. Separately, several of these same actions (`import/browse`, `deploy/browse`, `mods-path/browse`) trigger a real, interactive native folder-picker dialog window on the host machine's desktop, spammable by any authenticated user.

## Reason

Combined with mod-install/world-settings-write operations that write files relative to an instance's `serverPath`, an "admin" account (meant to be a trusted friend with day-to-day *operational* access - start/stop, mods, players) had effectively broader filesystem reach than intended: point a fake "instance" at an arbitrary folder, then use existing mod-install/enable/disable file operations against it. This exceeds "operate the game server" and moves toward "read/write access to the host machine." This matches the standard pattern used by comparable game-server panels (e.g. Crafty Controller, Pterodactyl): server/instance registration and configuration is an admin-level action; regular users are scoped to operating servers that already exist.

## Implementation Plan

* [x] `app/routes/instances.py`: `import_existing`, `import_detected`, `browse_import`, `deploy`, `browse_deploy_dir`, and `remove_instance` now require `super_admin` (added `dependencies=[Depends(require_super_admin)]`). `list_instances`, `get_active`, and `set_active` remain available to any authenticated admin, since switching between already-registered servers is legitimate day-to-day use.
* [x] `app/routes/mods.py`: `set_mods_path` and `browse_mods_path` now require `super_admin` for the same reason (arbitrary-path override + dialog trigger).
* [x] Frontend: `InstanceManagerPanel` now hides "Import Existing," "Deploy New Server," and each instance's "Remove" button (and the corresponding dialogs) unless the logged-in user is the super admin, so a regular admin doesn't see actions that would now 403 - shows a role-appropriate empty-state message instead.

## Files Modified

* `app/routes/instances.py`
* `app/routes/mods.py`
* `web/src/components/settings/InstanceManagerPanel.tsx`

## Testing

Verified end-to-end via real HTTP requests through the actual FastAPI app: registered a super admin and an invited regular admin, confirmed the regular admin gets 403 on `POST /api/instances/import` and `POST /api/mods/mods-path/browse`. Confirmed via code inspection that `mods-path`'s browse/set endpoints have no current frontend caller at all (dead API surface), so no UI regression there; `tsc -b` typechecks clean after the `InstanceManagerPanel` role-gating changes.

## Result

Only the super admin can now register, deploy, or remove server instances, override the mods folder path, or trigger native folder-picker dialogs on the host machine. Regular admins retain full operational control (start/stop, mods, players, World Settings except credentials) over servers the super admin has already set up.

## Notes

Part of a batch of fixes from a full security audit; see TICKET-0008/0010/0011 for the others.

## Closed

2026-07-06
