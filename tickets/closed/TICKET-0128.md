# TICKET-0128

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

User reported the installer failing with "access is denied" on a specific file partway through installation. No prior AutoPalExpress install was found registered on their machine (checked `HKLM`/`HKCU` uninstall keys directly), so this is a fresh install hitting a folder-permissions problem, not an upgrade issue.

Investigation: a real `/VERYSILENT` install with an explicit `/DIR=` pointed at a writable folder completed successfully end-to-end (confirmed via the install log: "Administrative install mode: No", "User privileges: None", every file/icon/registry step "Successfully installed/created"). This means the core per-user, non-elevated install mechanism (TICKET-0123/0125) works correctly - the failure is specific to *which* folder ends up targeted. Since `PrivilegesRequired=lowest` with no elevation override (TICKET-0123) means Setup will never self-elevate to fix an unwritable folder, if a user browses to (or the environment resolves the default to) a folder requiring admin rights - most plausibly something under `Program Files` - the file copy step fails with a generic, unhelpful Windows "Access is denied" error with no guidance on why or what to do about it.

---

## Reason

Direct user report, immediately following TICKET-0123/0125. Whatever the exact folder involved, the underlying UX problem is real regardless: this installer can never elevate to fix a permissions problem (by design, per the user's own TICKET-0123 choice), so it needs to catch an unwritable destination *before* attempting the real install and explain clearly what to do, instead of failing deep inside the file-copy step with a bare OS error.

---

## Implementation Plan

* [x] `installer.iss`: added a real write-test (`CanWriteToDir`: `ForceDirectories` + a temp file write/delete) against the chosen `{app}` folder, run from the same `NextButtonClick(CurPageID = wpSelectDir)` handler added in TICKET-0125 (right after the user confirms a destination folder, the same point `{app}` first becomes valid). If the folder isn't actually writable, shows a clear, specific message explaining that this folder needs administrator rights (most commonly true of anything under `Program Files`) and to pick a different folder instead, then keeps the user on the directory page (`Result := False`) instead of letting them proceed toward a guaranteed later failure.
* [x] Recompiled and verified: a real `/VERYSILENT` install pointed at `C:\Program Files\ApexInstallWriteTest12345` (unelevated) showed exactly the new message ("AutoPalExpress could not write to this folder... this installer never asks for those...") and created nothing - no folder, no Start Menu entry, no registry key.
* [x] Re-verified the already-working writable-folder path (a scratch temp directory) still installs cleanly end-to-end after this change (exit code 0, exe present, log shows a clean full run).

---

## Files Modified

* `installer.iss`

---

## Testing

* `ISCC.exe installer.iss` - compiles clean.
* Real `/VERYSILENT` installs, both outcomes verified directly:
  * Unwritable folder (`C:\Program Files\...`, not elevated): blocked with the new clear message, confirmed via the Inno install log's own "Message box (OK):" entry showing the exact text, and confirmed the target folder was never created.
  * Writable scratch folder: still installs successfully (exit code 0, log ends "Installation process succeeded").
* New installer checksum: `73A3418EB3E43295DCEE7F4D32F67636787453B753B69752BAC048B375FF4712`.

---

## Result

The installer now fails fast and clearly when the chosen folder needs admin rights it will never request, instead of an opaque "Access is denied" partway through copying files.

---

## Notes

Two mistakes made and corrected during investigation, worth remembering:
1. A `/VERYSILENT` test install (even with an explicit scratch `/DIR=`) still writes to the *real* Start Menu, Desktop, and `HKCU` uninstall registry key on the machine running it - those aren't redirected by `/DIR`. Both real test runs during this investigation left genuine shortcuts/registry entries on the dev machine; both were found and cleaned up immediately (`Remove-Item` on the Start Menu folder/Desktop `.lnk`, `Remove-Item` on the `HKCU:\...\Uninstall\{GUID}_is1` key) rather than left dangling.
2. `Start-Process -ArgumentList` with a plain array does not auto-quote elements containing spaces - passing `/DIR=$pathWithSpaces` as one unquoted array element silently truncated at the space (`C:\Program Files\...` became just `C:\Program`, which then actually installed there for real). Fixed by embedding literal quotes inside the array element itself (`` "/DIR=`"$path`""  ``) so the resulting command line matches what a real user typing `/DIR="path with spaces"` would produce.

---

## Closed

2026-07-13
