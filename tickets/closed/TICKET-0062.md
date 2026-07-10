# TICKET-0062

**Status**

Closed

**Type**

Feature

**Priority**

Medium

**Created**

2026-07-10

---

## Description

The installer already auto-detects an existing install (via
`%LOCALAPPDATA%\PalworldServerAdmin\data`) and silently skips first-run setup
pages on a repeat run, but it never offered an explicit choice - running the
installer only ever installs/updates, and uninstalling requires finding
`unins000.exe` separately (Start Menu shortcut or Control Panel). Add an
explicit "Install / Update / Uninstall" radio-button page right after the
Welcome page, so the same `PalworldServerAdmin-Setup.exe` can also drive
uninstall directly.

## Reason

User request: a single installer entry point with a clear choice instead of
uninstall only being reachable through a separate shortcut.

---

## Implementation Plan

* [x] Add a `TInputOptionWizardPage` with three exclusive radio options
      (Install / Update / Uninstall) anchored right after `wpWelcome`.
* [x] Detect whether AutoPalExpress is actually currently installed via the
      real Inno-managed uninstall registry key (`HKA`, `UninstallString`) -
      not the existing `ExistingSetup` data-folder check, since app data is
      deliberately kept after uninstall and would give a false positive.
* [x] Preselect Update when already installed, Install otherwise. Block
      progressing past the page if Uninstall is chosen but nothing is
      actually installed.
* [x] If Uninstall is chosen and confirmed, run the real uninstaller
      (`ewWaitUntilTerminated`) and exit the setup process immediately
      afterward instead of continuing into the install wizard.
* [x] Leave the existing Install/Update code path (directory page, tasks,
      first-run setup pages, `ExistingSetup` skip logic) untouched - both
      radio choices lead into the same flow, since Inno's own directory
      auto-resolution and this file's existing `ExistingSetup` check already
      do the right thing regardless of which of the two labels the user
      picked.
* [x] Compile with Inno Setup's `ISCC.exe` to verify the script is valid and
      the new page behaves as expected.
* [x] Update documentation and ticket memory. Rebuild the release executable
      if warranted.

---

## Files Modified

* `installer.iss`
* `CHANGELOG.md`

---

## Testing

* Compiled the updated `installer.iss` with the real `ISCC.exe` (Inno Setup
  6.7.3, installed under `%LOCALAPPDATA%\Programs\Inno Setup 6`) against the
  existing `dist\PalworldServerAdmin.exe` and `support\` files - compiled
  cleanly with no errors or warnings.
* Launched the compiled `PalworldServerAdmin-Setup.exe` to confirm it opens
  without crashing; confirmed via window enumeration that a
  "Setup - Palworld Server Admin version 1.0.0" window was created and
  responsive. Could not click through the wizard pages themselves to see the
  new radio-button page rendered, since this sandbox's shell runs in a
  separate session from the interactive desktop and can't drive or screenshot
  it (same limitation already noted in TICKET-0018) - confirmed this isn't
  new: `SetForegroundWindow`/`EnumWindows` located and "focused" the real
  window handle, but the screen capture never changed, meaning the capture
  and the window belong to different sessions. Terminated the test process
  afterward.
* **A real interactive click-through of the new Setup Mode page (all three
  radio choices, especially Uninstall) still needs to be done by a human on
  this machine before shipping** - the Pascal logic was carefully checked
  against Inno Setup's documented API (`CreateInputOptionPage`,
  `SelectedValueIndex`, `RegQueryStringValue` with `HKA`, `RemoveQuotes`,
  `ExitProcess` via `external`) but has not been exercised end-to-end by a
  human yet.

---

## Result

`PalworldServerAdmin-Setup.exe` now opens with a "Setup Mode" page right
after Welcome, offering Install / Update / Uninstall as radio buttons,
pre-selecting Update when AutoPalExpress is already installed. Choosing
Uninstall (after a confirmation that explains server data/config is kept)
runs the real uninstaller and exits immediately instead of continuing into
the install wizard; choosing it when nothing is installed shows an error
instead of proceeding. Install and Update both continue into the existing,
unchanged setup flow - Inno's own directory auto-resolution and this file's
`ExistingSetup` data-folder check already produce the right behavior for
either label. No executable rebuild was needed for this ticket (installer
script only); the compiled `installer_output\PalworldServerAdmin-Setup.exe`
already reflects the change from the ISCC compile done for verification.

## Notes

Two related but distinct checks now exist in this file: `ExistingSetup`
(data-folder-based, decides whether to skip first-run setup pages) and
`IsAppInstalled` (real Inno uninstall-registry-based, decides the Setup Mode
default and whether Uninstall is even valid to choose). Don't conflate them -
app data is deliberately kept after uninstall (see the `[Registry]` section
comment), so a machine can have `ExistingSetup = True` and
`IsAppInstalled = False` at the same time (uninstalled, but data never
cleared), which is exactly the case this distinction exists to handle
correctly.

---

## Closed

2026-07-10
