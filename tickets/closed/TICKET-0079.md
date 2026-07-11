# TICKET-0079

**Status**

Closed

**Type**

Release

**Priority**

High

**Created**

2026-07-11

---

## Description

Rebuild the Windows executable and installer after TICKET-0078.

---

## Reason

The installed app needs to include the default-off Steam Query Port toggle.

---

## Implementation Plan

* [x] Rebuild frontend.

* [x] Rebuild PyInstaller executable.

* [x] Compile Inno Setup installer.

* [x] Update checksum documentation.

* [x] Commit and push.

---

## Files Modified

* `CHANGELOG.md`
* `README.md`
* `installer_output/CHECKSUMS.txt`
* `.claude/memory/project_memory.md`
* `.claude/memory/ticket_memory.md`

---

## Testing

* Passed: `powershell -ExecutionPolicy Bypass -File .\build_installer.ps1`
* Installer output: `installer_output\PalworldServerAdmin-Setup.exe`
* SHA256: `57404DC5DAE6FA3BEDF9E5B5D8584AC1AAA94B01DFDF1A8506A44F0E1DAE7322`

---

## Result

The packaged installer has been rebuilt with TICKET-0078.

---

## Closed

2026-07-11
