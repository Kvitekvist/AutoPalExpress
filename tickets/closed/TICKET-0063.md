# TICKET-0063

**Status**

Closed

**Type**

Bug

**Priority**

High

**Created**

2026-07-10

---

## Description

User uninstalled AutoPalExpress with TICKET-0062's new Uninstall option, then
reinstalled - the installer never asked to create an admin account again.

Root cause: `%LOCALAPPDATA%\PalworldServerAdmin\data\users.json` (the admin
account) is part of the same app-data folder that's deliberately kept on
uninstall (to protect `instances.json` - references to real, separately-
installed Palworld server folders and downloaded mods). The installer's
`HasExistingSetup()` check treats the presence of *any* of `users.json`,
`instances.json`, or `system_settings.json` as "this is an update, skip
first-run setup entirely," so it also skips the Super Admin page even though
the actual admin account no longer functionally exists from the user's point
of view after a real uninstall - it's still sitting in the kept data folder,
so the app would in fact still work with the old account, which isn't what
someone who just uninstalled expects.

## Reason

Direct user bug report after a real uninstall/reinstall cycle.

---

## Implementation Plan

* [x] Add `CurUninstallStepChanged` to `installer.iss` so the fix applies to
      *every* uninstall path (the new installer-driven Uninstall option,
      Control Panel, and the Start Menu "Uninstall" shortcut all run the same
      compiled `unins000.exe`) - not just the new radio-button flow. At
      `usPostUninstall`, delete `users.json` (the admin account) and
      `system_settings.json` (app-level prefs like startup recovery, whose
      matching registry entry is already auto-removed via `uninsdeletevalue`).
      Leave `instances.json`, mods, and backups untouched - that's the data
      the original design comment was protecting.
* [x] Split the installer wizard's single `ExistingSetup` flag into two
      independent checks: `HasAdminAccount` (`users.json` only, gates the
      Super Admin page) and `HasServerData` (`instances.json` only, gates the
      New Server pages). A post-uninstall reinstall now has
      `HasAdminAccount = False` but `HasServerData = True` if a real server
      was registered before - it should ask for a new admin account without
      also asking to deploy a redundant new server.
* [x] Update `CurStepChanged`'s seed-skip shortcut to require both checks
      true (nothing new to provision) before skipping seed writing/applying,
      instead of the old single flag.
* [x] Update the `[Registry]` section comment now that uninstall is no
      longer "leaves everything in place."
* [x] Compile with `ISCC.exe` to verify.
* [x] Update documentation and ticket memory.

---

## Files Modified

* `installer.iss`
* `CHANGELOG.md`

---

## Testing

* Compiled with a real `ISCC.exe` (Inno Setup 6.7.3) twice (once after the
  core fix, once after a follow-up comment cleanup pass) - both compiled
  clean with no errors.
* `grep`-verified no leftover references to the old, removed
  `ExistingSetup`/`HasExistingSetup` symbols anywhere in the file.
* Traced the exact reported scenario through the new logic by hand:
  uninstall (via any path) clears `users.json` + `system_settings.json` via
  `CurUninstallStepChanged`, keeps `instances.json` -> on reinstall,
  `AdminAccountExists = False`, `ServerDataExists = True` ->
  `ShouldSkipPage` now shows the Super Admin page but still hides the New
  Server pages (no redundant "deploy another server" prompt for a server
  that's already registered) -> `CurStepChanged` writes and applies a seed
  containing only the new admin credentials, since `BuildSeedJson` only adds
  `serverName` when `ServerNamePage` was actually shown/filled.
* Confirmed `has_any_users()` / `create_first_super_admin()` in
  `app/services/auth.py` handle a missing `users.json` safely (falls back to
  an empty list, so `needsSetup` correctly becomes `True`) and safely no-op
  (caught `AuthError`, logged, not fatal) if a seed with blank/duplicate
  credentials were ever applied when an account already exists - confirms
  the design is safe even at the edges, not just the happy path.
* **Did not** perform a live uninstall/reinstall against the user's actual
  current installation to verify interactively - that would have reset
  their real admin account outside of a moment they chose to do it. Real
  end-to-end verification will happen naturally the next time the user
  uninstalls/reinstalls for real.

---

## Result

Uninstalling AutoPalExpress (through the new installer Setup Mode option,
Control Panel, or the Start Menu shortcut - all three now behave the same
way) clears the saved admin account and app-level settings while leaving
real Palworld server registrations, mods, and backups untouched. Reinstalling
afterward now correctly asks to create a new admin account again, without
also redundantly asking to deploy a new first server when one is already
registered.

## Notes

This is the second installer ticket in a row (after TICKET-0062) that
couldn't get a real interactive GUI click-through in this environment - see
TICKET-0018 for the original note on why. Both tickets' Pascal logic was
verified by compile + careful manual trace instead. Worth a real supervised
click-through of the full Install -> Uninstall -> Reinstall cycle at some
point to close that gap for good.

---

## Closed

2026-07-10
