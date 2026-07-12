# TICKET-0095

**Status**

Closed

**Type**

Enhancement

**Priority**

Low

**Created**

2026-07-12

---

## Description

User asked for a batch file to compile new installer executables instead of having to run `build_installer.ps1` directly. This also satisfies this project's standing requirement to maintain a `scripts/build.bat`.

---

## Implementation Plan

* [x] Added `scripts/build.bat`, a thin wrapper that invokes the existing `build_installer.ps1` (frontend build, PyInstaller, Inno Setup) without disabling PowerShell's execution policy.
* [x] Ran it to produce a fresh installer covering TICKET-0092/0093/0094.

---

## Files Modified

* `scripts/build.bat` (new)

---

## Testing

* Ran `scripts\build.bat` end to end; produced `installer_output/PalworldServerAdmin-Setup.exe` (SHA256 `4239c57b31b9ae30a8ca8ef30023f6e05218330fb5acddc2da35d45bdb7d599d`).

---

## Result

`scripts/build.bat` now exists as the one-command way to rebuild the installer; used it to produce a build for the user to test the recent fixes.

---

## Closed

2026-07-12
