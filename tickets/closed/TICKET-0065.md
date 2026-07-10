# TICKET-0065

**Status**

Closed

**Type**

Release

**Priority**

Medium

**Created**

2026-07-10

---

## Description

Cut version 1.0.2: rebuilt the frontend, PyInstaller executable, and Inno
installer from current `main` (through TICKET-0064), bumped
`installer.iss`'s `MyAppVersion` to `1.0.2`, converted `CHANGELOG.md`'s
running "Current build vs. origin/main" section into a proper `## 1.0.2`
release section, tagged `1.0.2`, and published a GitHub Release with the
built installer attached.

## Reason

User request: release everything currently on `main` as version 1.0.2, with
a tag and the installer attached as a release asset.

---

## Implementation Plan

* [x] Bump `installer.iss`'s `MyAppVersion` from `1.0.0` to `1.0.2`.
* [x] Convert `CHANGELOG.md`'s running section into `## 1.0.2 - 2026-07-10`,
      scoped to everything since the `1.0.0` tag (`git log current..HEAD`) -
      TICKET-0050 through TICKET-0064, not re-listing TICKET-0041-0048 since
      those already shipped as part of `1.0.0`.
* [x] Full rebuild: `npm run build` (frontend), PyInstaller
      (`PalworldServerAdmin.spec`), then `ISCC.exe installer.iss` - not just
      recompiling the installer script against stale `dist\` output, since
      TICKET-0061 changed backend Python source
      (`app/services/palworld_settings.py`) that the existing packaged exe
      predated.
* [x] Record the new installer's SHA256 checksum in the changelog.
* [x] Commit the version bump/changelog, tag `1.0.2` on that commit, push
      both.
* [x] Create a GitHub Release for tag `1.0.2` with release notes summarizing
      the 1.0.0 -> 1.0.2 diff, and upload the built
      `PalworldServerAdmin-Setup.exe` as a release asset.

---

## Files Modified

* `installer.iss`
* `CHANGELOG.md`

---

## Testing

* `npm run build` completed (the one stderr "chunk size" warning is
  pre-existing and non-fatal - confirmed by checking `web/dist/assets`
  actually updated).
* PyInstaller build completed with exit code 0 and picked up the
  `palworld_settings.py` changes (`Building because
  app\services\palworld_settings.py changed` in its own log output).
* `ISCC.exe` compiled the installer cleanly with the version-bumped
  `installer.iss`.
* Verified the release installer's SHA256 via both `Get-FileHash`
  (PowerShell) and `sha256sum` (bash) independently - both agree:
  `50f9f4615efc6fa34239169fbde1f08cb8e02041df7354e4e8b0abbb34c5794b`.

---

## Result

Version 1.0.2 is tagged and released on GitHub with
`PalworldServerAdmin-Setup.exe` attached, reflecting every change on `main`
through TICKET-0064 (World Settings config-schema update, the installer's
new Install/Update/Uninstall page and its follow-up admin-account fix, and
the Nexus description sync).

---

## Closed

2026-07-10
