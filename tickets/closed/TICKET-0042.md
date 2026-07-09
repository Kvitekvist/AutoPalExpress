# TICKET-0042

**Status**

Closed

**Type**

Bug

**Priority**

High

**Created**

2026-07-09

---

## Description

The installed app screenshot did not show the Launcher Options sidebar entry even though the source code and built frontend contained it.

---

## Reason

The visible installed app was using an older packaged frontend bundle. The current source and `web/dist` already include the Launcher Options nav item between World Settings and Logs, so the fix was to rebuild the distributable installer and refresh the published checksum.

---

## Implementation Plan

* [x] Verify the source sidebar includes Launcher Options.

* [x] Verify the built frontend bundle includes Launcher Options.

* [x] Rebuild `PalworldServerAdmin-Setup.exe`.

* [x] Update the release checksum.

---

## Files Modified

* `README.md`
* `installer_output/CHECKSUMS.txt`

---

## Testing

* Passed: `powershell -ExecutionPolicy Bypass -File .\build_installer.ps1`
* New installer SHA-256: `DE47FB088842FA3135856407919601A759B642BFADF328CCED007B7E1EC2042B`

---

## Result

The rebuilt installer now packages the frontend bundle containing the Launcher Options sidebar entry.

---

## Closed

2026-07-09
