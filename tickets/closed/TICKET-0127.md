# TICKET-0127

**Status**

Closed

**Type**

Enhancement

**Priority**

High

**Created**

2026-07-13

---

## Description

The installer, the packaged exe, and a few internal Windows-integration strings still say "Palworld Server Admin" / `PalworldServerAdmin.exe` instead of "AutoPalExpress" - inconsistent with the project's actual name used everywhere else (GitHub repo, README, Nexus API `Application-Name` header, which is already `"AutoPalExpress"`).

Confirmed scope with the user via AskUserQuestion: rename the installed .exe itself too, not just the installer's display name/branding text.

---

## Reason

Direct user request: "make sure the program installs as AutoPalExpress, not Palworld Server Admin."

---

## Implementation Plan

* [x] `PalworldServerAdmin.spec` renamed to `AutoPalExpress.spec`; `name='PalworldServerAdmin'` -> `name='AutoPalExpress'` (PyInstaller now outputs `dist/AutoPalExpress.exe`).
* [x] `installer.iss`: `MyAppName`/`MyAppPublisher` -> "AutoPalExpress", `MyAppExeName` -> "AutoPalExpress.exe", `OutputBaseFilename` -> "AutoPalExpress-Setup", `[Files]`'s `Source: "dist\PalworldServerAdmin.exe"` -> `"dist\AutoPalExpress.exe"`. `AppId` (the GUID) stays exactly the same. Added a `[InstallDelete]` entry removing a stale `{app}\PalworldServerAdmin.exe` left behind in an existing install folder when upgrading from a pre-rename version.
* [x] `app/services/system_settings.py`: the hardcoded startup-recovery exe check -> `"AutoPalExpress.exe"`.
* [x] `app/paths.py`: `APP_DIR_NAME` renamed to `_LEGACY_APP_DIR_NAME`, **value unchanged** ("PalworldServerAdmin") - still needed verbatim for the TICKET-0123 legacy-AppData migration lookup.
* [x] `app/routes/network.py`: `ADMIN_FIREWALL_RULE_NAME` -> "AutoPalExpress"; added `_LEGACY_ADMIN_FIREWALL_RULE_NAME` fallback so `GET /firewall/status` still reports "already allowed" for a rule created under the old name by a previous version. UPnP admin-forward mapping `description` text updated too (cosmetic only - matched by port number elsewhere, confirmed via grep, so no compat concern). Left `_game_firewall_rule_name`'s "Palworld Server Game Port ..." alone - that labels the Palworld game server's own port, not this tool.
* [x] `desktop_app.py`: both `MessageBoxW` title and the startup-failure message text -> "AutoPalExpress".
* [x] `web/src/components/settings/RemoteAccessPanel.tsx`: suggested router-rule name -> "AutoPalExpress Panel".
* [x] `build_installer.ps1`, `scripts/build.bat`: updated comments/messages referencing the old spec/exe/installer filenames.
* [x] `README.md`, `GETTING_STARTED.md`, `NEXUS_DESCRIPTION.md`, `.claude/project_config.md`: updated download/build instructions, output filenames, and the Nexus page's own title. Left README's one mention of the *old* `%LOCALAPPDATA%\PalworldServerAdmin\data` path alone (describes real history, not current branding); left `support/diagnose-autopalexpress.ps1`'s own standalone-fallback defaults alone too (already superseded by TICKET-0123's install-folder convention regardless of this rename, and always overridden by explicit args from both real callers).
* [x] Full rebuild (`scripts\build.bat`), fresh checksum, and real launch/install tests of the compiled installer.

---

## Files Modified

* `PalworldServerAdmin.spec` -> renamed `AutoPalExpress.spec`
* `installer.iss`
* `app/services/system_settings.py`
* `app/paths.py`
* `app/routes/network.py`
* `desktop_app.py`
* `web/src/components/settings/RemoteAccessPanel.tsx`
* `build_installer.ps1`
* `scripts/build.bat`
* `README.md`
* `GETTING_STARTED.md`
* `NEXUS_DESCRIPTION.md`
* `.claude/project_config.md`

---

## Testing

* `python -m py_compile app/paths.py app/services/system_settings.py app/routes/network.py desktop_app.py` - passes.
* `npx tsc --noEmit` - passes with no errors.
* Full rebuild via `scripts\build.bat` - frontend, PyInstaller (now producing `AutoPalExpress.exe`), and Inno Setup (now producing `AutoPalExpress-Setup.exe`) all compiled cleanly.
* Real launch test of the compiled installer via `EnumWindows`/`GetWindowText`: confirmed the wizard's actual visible title is `"Setup - AutoPalExpress version 1.0.7"`.
* Real `/VERYSILENT` install into a scratch folder: confirmed the installed exe is `AutoPalExpress.exe`, and every shortcut (`AutoPalExpress.lnk`, `Diagnose AutoPalExpress.lnk`, `Uninstall AutoPalExpress.lnk`, plus the Desktop shortcut) and the Start Menu **folder** itself all read "AutoPalExpress" for this fresh install.
* Real boot smoke test of the renamed `dist\AutoPalExpress.exe` in an isolated scratch folder with `$env:LOCALAPPDATA` overridden: booted cleanly (`HTTP 200` from `/`), data self-contained under the scratch folder as expected.
* New installer checksum: `8B8794ACC0F597C8B0786D23A08AD7F5FDC40E5010D61D463B567AFAB74D01A4`. Removed stale old-named build artifacts (`dist/PalworldServerAdmin.exe`/`.7z`, `installer_output/PalworldServerAdmin-Setup.exe`/`.7z`) left over from before the rename.

---

## Result

The installer, Start Menu, Desktop shortcut, and the packaged executable itself all now say "AutoPalExpress" - verified directly against the real compiled installer and exe, not just by reading the changed source.

---

## Notes

Known accepted limitation, not fixed: a user upgrading from a pre-rename version keeps their existing Start Menu **folder** named "Palworld Server Admin" (Inno remembers a previous install's group name by AppId, independent of the current `DefaultGroupName`), even though the shortcut *inside* it renames to "AutoPalExpress." Only a genuinely fresh install gets the new folder name too. Not worth adding `[Code]`-level group-folder migration for a cosmetic, self-resolving-on-reinstall detail.

Process note: every real (non-scratch-isolated) test install run against this actual dev machine during TICKET-0127/0128 investigation - Start Menu folders, Desktop shortcuts, and `HKCU` uninstall registry keys - was found and removed immediately after being created, rather than left behind. `/VERYSILENT` with a scratch `/DIR=` still writes those three to the real machine; only the `[Files]` destination is redirected.

---

## Closed

2026-07-13
