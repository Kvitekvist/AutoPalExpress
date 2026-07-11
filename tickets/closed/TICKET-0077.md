# TICKET-0077

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

Rebuild the Windows executable and installer after TICKET-0075 and TICKET-0076.

---

## Reason

The installed app needs to include the Steam query-port collision fix and the in-app diagnostics fallback fix.

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
* SHA256: `D07A9649E10605DFB8CDD301AB07778B88EEAE7AB2D7E9039373C1F4F620C91C`

---

## Result

The packaged installer has been rebuilt with TICKET-0075 and TICKET-0076.

---

## Closed

2026-07-11
