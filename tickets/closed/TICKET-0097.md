# TICKET-0097

**Status**

Closed

**Type**

Release

**Priority**

Medium

**Created**

2026-07-12

---

## Description

Cut version 1.0.6, covering TICKET-0088 through TICKET-0096 (Nexus compliance fixes, the per-server mod wishlist and its own sidebar page, the donation link, GitHub release notifications, the Windows 10 packaged-login MIME fix, the first-run "no servers" fix, the `scripts\build.bat` build wrapper, and the README refresh), and publish it as a GitHub Release with the installer attached.

---

## Implementation Plan

* [x] Converted `CHANGELOG.md`'s `## Unreleased (1.0.6)` section into a proper `## 1.0.6 - 2026-07-12` release section.
* [x] Confirmed `installer.iss` and `app/version.py` already both declared `1.0.6` (set during TICKET-0088); no version bump needed this time.
* [x] Full rebuild via `scripts\build.bat` (frontend + PyInstaller + Inno Setup) against current `main`.
* [x] Updated the installer checksum in `CHANGELOG.md`, `README.md`, and `installer_output/CHECKSUMS.txt`.
* [x] Tagged `v1.0.6` and pushed the tag.
* [x] Published a GitHub Release (`v1.0.6`) with `PalworldServerAdmin-Setup.exe` attached, notes highlighting the mod wishlist's Nexus Mods API-key compliance angle per the user's request.

---

## Files Modified

* `CHANGELOG.md`
* `README.md`
* `installer_output/CHECKSUMS.txt` (local, not committed - gitignored build output)

---

## Testing

* `scripts\build.bat` completed cleanly (frontend build, PyInstaller, Inno Setup) with no errors.
* Verified `installer.iss`/`app/version.py` agreed on `1.0.6` via `scripts/check_app_version.py`, which the build script runs automatically.

---

## Result

AutoPalExpress 1.0.6 is tagged and published as a GitHub Release with the installer attached. Final installer SHA256 is `aabaddd84a80676ea753e925d85fea23e4bd5a1ba80444edbd738149e3139b83`.

---

## Closed

2026-07-12
