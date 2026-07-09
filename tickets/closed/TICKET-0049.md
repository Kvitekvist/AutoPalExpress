# TICKET-0049

**Status**

Closed

**Type**

Release

**Priority**

Medium

**Created**

2026-07-09

---

## Description

Prepare the release changelog and final rebuilt installer for the local changes ahead of `origin/main`.

---

## Reason

The branch contains ticketed commits TICKET-0041 through TICKET-0048 ahead of the currently pushed version. The release notes should clearly show what changed between the current remote version and this build before pushing the ticket commits.

---

## Implementation Plan

* [x] Add a changelog section summarizing TICKET-0041 through TICKET-0048.
* [x] Rebuild the final executable/installer.
* [x] Refresh the installer checksum in release docs.
* [x] Commit the release-prep files.

---

## Files Modified

* `CHANGELOG.md`
* `README.md`

---

## Testing

* Passed: `powershell -ExecutionPolicy Bypass -File .\build_installer.ps1`
* New installer SHA-256: `18D018D9A59C247E36F0CF4CD2622AC75F1E4A6D27FB01F4E2B890993944DC1E`
* Note: the first non-elevated installer build reached PyInstaller but Windows denied `ISCC.exe`; rerunning the same build with permission succeeded.
* Note: Vite still reports the existing large-chunk warning after a successful build.

---

## Result

The changelog now clearly lists the release delta from `origin/main` through TICKET-0048, and the final installer has been rebuilt with an updated checksum.
