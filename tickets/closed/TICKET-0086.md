# TICKET-0086

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

Release version 1.0.5, covering TICKET-0081 (Logs page IP masking/polling noise/order), TICKET-0082 and TICKET-0084 (mod archives with a nested relative game path unpacking to a broken doubled folder), TICKET-0083 (Nexus Direct Install file picker for mods with more than one file), and TICKET-0087 (removed the bundled `.cmd` batch file Nexus's scanner was flagging, found and fixed mid-release before publishing).

---

## Reason

User request: "release the update as version 1.0.5, highlight the mod fix for unpacking nested mods, and that mods with multiple downloads shows a list."

---

## Implementation Plan

* [x] Converted `CHANGELOG.md`'s `## Unreleased` section into `## 1.0.5 - 2026-07-11`, reordering it so the mod-unpacking fix (TICKET-0082/TICKET-0084) and the multi-file picker (TICKET-0083) are the first two highlighted entries, per the user's explicit request.
* [x] Bumped `installer.iss`'s `MyAppVersion` to `1.0.5`.
* [x] Mid-release, the user asked about a `.cmd` file Nexus's scanner was flagging - fixed as TICKET-0087 and folded into this same release rather than shipping 1.0.5 first and 1.0.6 immediately after.
* [x] Rebuilt the PyInstaller executable and the Inno Setup installer (final rebuild after TICKET-0087, superseding the earlier 1.0.5 build made before that fix).
* [x] Updated the installer checksum in `CHANGELOG.md`, `README.md`, and `installer_output/CHECKSUMS.txt`.
* [x] Updated ticket memory and project memory.
* [x] Committed, tagged `v1.0.5`, pushed, and published a GitHub Release with the installer attached.

---

## Files Modified

* `CHANGELOG.md`
* `README.md`
* `installer.iss`
* `installer_output/CHECKSUMS.txt` (git-ignored, local only)
* `.claude/memory/project_memory.md`
* `.claude/memory/ticket_memory.md`

---

## Testing

* `python -m PyInstaller PalworldServerAdmin.spec --noconfirm` completed successfully (no source changes since the prior test build - PyInstaller confirmed nothing to rebuild).
* `ISCC.exe installer.iss` compiled successfully - output `installer_output\PalworldServerAdmin-Setup.exe`.
* Final installer SHA256 (after folding in TICKET-0087): `11AB0B83B8230B00A3F4C8B51451CB4DA68C0756867BDC99170F540685236FD9`.

---

## Result

Version 1.0.5 published as a GitHub Release with the installer attached, leading with the mod-unpacking fix and the new multi-file Nexus picker as requested.

---

## Closed

2026-07-11
