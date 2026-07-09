# TICKET-0040

**Status**

Closed

**Type**

Enhancement

**Priority**

High

**Created**

2026-07-09

---

## Description

The Windows installer currently behaves like a first install every time, asking for server name, super admin username, and password on reinstall. It should support fresh install, update, and repair flows without making an existing host re-enter setup details.

---

## Reason

Updates and repairs should preserve the existing `%LOCALAPPDATA%\PalworldServerAdmin\data` state. Requiring credentials again makes normal upgrades feel like data loss and can create unnecessary first-run seed files.

---

## Implementation Plan

* [x] Detect existing AutoPalExpress app data during installer wizard setup.

* [x] Skip first-time server and super-admin pages during update/repair.

* [x] Avoid writing `first_run_seed.json` and running first-time setup when existing data is present.

* [x] Update documentation and verify the installer script compiles.

---

## Files Modified

* `installer.iss`
* `README.md`
* `CHANGELOG.md`
* `NEXUS_DESCRIPTION.md`
* `.claude/memory/architecture.md`
* `.claude/memory/decisions.md`
* `.claude/memory/project_memory.md`
* `.claude/memory/ticket_memory.md`

---

## Testing

* Passed: Inno Setup compile with `ISCC.exe installer.iss`
* Produced local installer: `installer_output\PalworldServerAdmin-Setup.exe`
* New SHA-256: `BF3AAE87E499DC0FF47E4BBFCF0FB3C7BDBE5B0EB78331752D47539BE7DA8F55`
* Not run: interactive update/repair wizard click-through, because this sandbox cannot safely drive the installer GUI.

---

## Result

Fresh installs still show first-time server and super-admin setup. Update/repair runs detect existing `%LOCALAPPDATA%\PalworldServerAdmin\data`, skip those first-time pages, delete any stale `first_run_seed.json`, and install the new application files while preserving the existing server list and admin account.

---

## Notes

Detection keys off existing app data files (`users.json`, `instances.json`, or `system_settings.json`) rather than only the install folder, so a machine with app files but no setup data still gets the fresh setup flow.

---

## Closed

2026-07-09
