# TICKET-0136

**Status**

Closed

**Type**

Enhancement

**Priority**

Medium

**Created**

2026-07-14

---

## Description

Make Program Files the actual default install location, while still letting the user pick a different folder on the destination page.

Previously (TICKET-0129), the installer first asked "install for me only" (no admin, default/recommended) vs "install for all users" (admin, real Program Files) via Inno's built-in "Select Setup Install Mode" page, then showed the folder picker defaulting to whichever the chosen mode implied. Since "me only" was the pre-selected default, Program Files was never actually the default outcome unless the user specifically chose the other option first.

Confirmed with the user via AskUserQuestion: drop the "install for me only" no-admin choice entirely. Setup now always requires administrator rights (one UAC prompt, like most traditional Windows installers) and always suggests real Program Files as the destination - the "Select Destination Location" page still lets the user Browse to (or type) any other folder they want, satisfying "users should be allowed to pick."

---

## Reason

Direct user request: "when i run the installer, i should have the option to choose where I install APE (default program files, but users should be allowed to pick)."

---

## Implementation Plan

* [x] `installer.iss`: `PrivilegesRequired` changed from `lowest` to `admin` (always elevate); removed `PrivilegesRequiredOverridesAllowed=dialog` (no longer a choice to override) and its explanatory comment, replaced with one explaining the new always-elevated model. `DefaultDirName` changed from `{autopf}\{#MyAppName}` (varied by chosen privilege mode) to `{commonpf}\{#MyAppName}` (always real Program Files, unambiguous now that elevation is guaranteed - `{pf}` is Inno's older, deprecated name for this constant, caught via a compiler warning and fixed).
* [x] Kept the TICKET-0128 `CanWriteToDir` write-test guard as defense-in-depth; updated its comment and the error message text, since "if the user declines elevation" no longer applies - there's no elevation choice left to decline.
* [x] Verified with `ISCC.exe`, a full rebuild, and real confirmation.

---

## Files Modified

* `installer.iss`

---

## Testing

* `ISCC.exe installer.iss` - compiles clean (one expected, understood warning remains: Inno flags that `HKCU`/`{userdocs}` areas are used under `PrivilegesRequired=admin`, since it can't guarantee the elevated context matches the original user in exotic multi-admin scenarios - accepted as fine for this app's real target: a single local admin elevating their own UAC prompt on their own machine, where the user context is unambiguous).
* Full rebuild via `scripts\build.bat` succeeded.
* Confirmed via the user's own real, live install (not a sandboxed test) run concurrently while this ticket was being verified: `C:\Program Files\AutoPalExpress\AutoPalExpress.exe` exists (confirming the new Program Files default took effect), and `Documents\AutoPalExpress\Servers` + `data\` (with a real created admin account) exist exactly as TICKET-0133 intends - this real install was left completely untouched, not treated as test scaffolding to clean up.
* This installer change directly exposed a real, separate latent bug (TICKET-0137 - a Windows argument-quoting gap in the Diagnostics elevation helper that had never been exercised by a space-containing path before Program Files became the default) - found and fixed in the same sitting via the user's live bug report.

---

## Result

The installer now always elevates (one UAC prompt) and defaults to real Program Files, while Browse still lets you pick any other folder - confirmed via the user's own real installation.

---

## Notes

This removes the no-admin "install for me only" option TICKET-0129 restored - confirmed acceptable with the user, who explicitly asked for Program-Files-by-default behavior over keeping that choice.

---

## Closed

2026-07-14
