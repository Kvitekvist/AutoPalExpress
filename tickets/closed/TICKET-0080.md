# TICKET-0080

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

Release version 1.0.4, covering everything shipped since the actual 1.0.3 GitHub Release (TICKET-0073 through TICKET-0078): the Sidebar/query-port UI feedback fixes, the new Run Diagnostics button, and - most importantly - the fix for Steam Query Port colliding with a server's own game port and silently shifting Palworld onto the wrong port.

---

## Reason

User request: "release version 1.0.4 with changelog from these tickets. Highlight that we fixed an issue from 1.0.3 where the steam query port could conflict with palserver port."

`CHANGELOG.md`'s `## 1.0.3` section had been getting appended to after the real v1.0.3 tag/release already shipped (TICKET-0073/0074/0075/0076/0078 were all added under it even though they landed after that release went out), so the changelog no longer matched what v1.0.3 actually contained.

---

## Implementation Plan

* [x] Restored the `## 1.0.3` changelog section to match what was actually in the `v1.0.3` tag (TICKET-0066/0067/0068/0069/0070/0071 only, original checksum `FFF568316915A39FF1BF2900CA2520AF48498610A87A5F50A1A1FC56F014ED3E`).
* [x] Added a new `## 1.0.4` section above it with TICKET-0073/0074/0075/0076/0078, leading with a callout that this release fixes the Steam Query Port/game-port collision bug from 1.0.3.
* [x] Bumped `installer.iss`'s `MyAppVersion` to `1.0.4`.
* [x] Rebuilt the frontend, the PyInstaller executable, and the Inno Setup installer.
* [x] Updated the installer checksum in `CHANGELOG.md`, `README.md`, and `installer_output/CHECKSUMS.txt`.
* [x] Updated ticket memory and project memory.

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

* `npm run build` passed (tsc + vite).
* `python -m PyInstaller PalworldServerAdmin.spec --noconfirm` completed successfully.
* `ISCC.exe installer.iss` compiled successfully - output `installer_output\PalworldServerAdmin-Setup.exe`.
* Verified the new installer's SHA256 checksum: `5B726B97261CBB18DBA81A4E4AE5261AFDCF4E9A6386F341B9B043833E429CE6`.

---

## Result

Version 1.0.4 built and ready to tag/publish as a GitHub Release. `CHANGELOG.md` now accurately separates what shipped in 1.0.3 from what's new in 1.0.4, with the query-port collision fix called out first.

---

## Closed

2026-07-11
