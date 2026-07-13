# TICKET-0125

**Status**

Closed

**Type**

Bug

**Priority**

Critical

**Created**

2026-07-13

---

## Description

User ran the installer produced by TICKET-0123 and hit: "internal error: an attempt was made to expand the app constant before it was initialized" - the installer failed immediately on launch, before the wizard even opened.

Root cause: TICKET-0123 changed `HasAdminAccount()`, `HasServerData()`, and `ServerInstallDirPage`'s default value to expand `{app}` (the install folder), moving them off the old `{localappdata}\PalworldServerAdmin\data` path. But `HasAdminAccount`/`HasServerData` were called from `InitializeWizard`, and `ServerInstallDirPage.Values[0]` was set there too - `InitializeWizard` runs immediately when Setup starts, before the user has even seen the "Select Destination Location" page, so `{app}` has no value to expand to yet. `{localappdata}` never had this problem since it doesn't depend on anything the wizard decides.

---

## Reason

Direct regression from TICKET-0123, reported live by the user immediately after the previous build.

---

## Implementation Plan

* [x] Remove the `AdminAccountExists := HasAdminAccount; ServerDataExists := HasServerData;` and `ServerInstallDirPage.Values[0] := ExpandConstant('{app}\data\servers');` calls from `InitializeWizard`.
* [x] Move all three to a new `NextButtonClick(CurPageID = wpSelectDir)` branch, which fires exactly once the user has confirmed a destination folder - the earliest point `{app}` is guaranteed valid, and still well before `ShouldSkipPage` is ever evaluated for the custom pages that depend on these flags (all anchored after `wpSelectTasks`, which itself comes after `wpSelectDir` in the wizard's page order).
* [x] Recompile with `ISCC.exe` to confirm no compile errors, then launch the real compiled installer and inspect its actual window title (via `EnumWindows`/`GetWindowText`, since a silent/background launch alone can't distinguish "crashed at an error dialog" from "showing the wizard normally") to confirm it reaches the real "Setup - Palworld Server Admin version 1.0.7" wizard instead of an internal-error dialog.

---

## Files Modified

* `installer.iss`

---

## Testing

* `ISCC.exe installer.iss` - compiles clean.
* Launched the real rebuilt `installer_output\PalworldServerAdmin-Setup.exe` and confirmed via `EnumWindows`/`GetWindowText` that its visible window title is the normal wizard ("Setup - Palworld Server Admin version 1.0.7"), not an error dialog - process stayed alive and responsive rather than crashing on load.
* New installer checksum: `036F86C17A537B2792E05217239C52AF7CA177232BBC9A2B607D161B1FD03F94`.

---

## Result

The installer opens normally again. `{app}`-dependent setup-skip logic and the default server folder are now computed right after the user picks a destination folder instead of before Setup has one.

---

## Notes

Lesson for future installer changes: any `{app}`/`{srcexe}`-style constant that depends on wizard state can only be expanded from `NextButtonClick`/`CurPageChanged`/`CurStepChanged` (i.e., after the relevant page has actually been reached), never from `InitializeWizard` or `InitializeSetup`, even indirectly through a helper function.

---

## Closed

2026-07-13
