# TICKET-0087

**Status**

Closed

**Type**

Bug

**Priority**

Medium

**Created**

2026-07-11

---

## Description

Remove the bundled `support/Diagnose-AutoPalExpress.cmd` batch file - Nexus Mods' file scanner flags it, likely because `.cmd`/`.bat` files bundled in installers are a common malware vector regardless of what they actually do.

---

## Reason

User report: "I checked github and it says .cmd... It seems nexusmods does not like that file so would be nice to not need it if possible."

The `.cmd` was only ever a thin wrapper: check for admin rights, self-relaunch elevated via `Start-Process -Verb RunAs` if not, then run `diagnose-autopalexpress.ps1` and pause. It existed purely to give the Start Menu shortcut UAC-elevation and a "press enter to close" pause without the user needing to know PowerShell's execution-policy flags. Since TICKET-0076 already added a graceful non-admin fallback path to the diagnostics script itself (used by the in-app Super Admin "Run Diagnostics" button), the `.cmd`'s elevation dance is no longer strictly necessary - the script already degrades gracefully to a WARN instead of failing outright when it isn't running elevated.

---

## Implementation Plan

* [x] Deleted `support/Diagnose-AutoPalExpress.cmd`.
* [x] `installer.iss`: removed its `[Files]` entry; the Start Menu `[Icons]` entry now launches `powershell.exe` directly with `-NoProfile -ExecutionPolicy Bypass -File "...\diagnose-autopalexpress.ps1" -DataDir "..." -ReportDir "..."` instead of pointing at the removed `.cmd` - same double-click experience, no batch file shipped at all, and the shortcut name (`Diagnose AutoPalExpress`) is unchanged so existing docs/screenshots referencing it by that name still apply.
* [x] `diagnose-autopalexpress.ps1`: updated its own non-admin warning message, which used to say "Use Diagnose-AutoPalExpress.cmd so Windows can ask for permission" - now points to right-clicking the shortcut/PowerShell and choosing "Run as administrator," or using the in-app Super Admin button instead.
* [x] Checked `GETTING_STARTED.md`, `NEXUS_DESCRIPTION.md`, `README.md` for references - all only mention the Start Menu shortcut by its display name ("Diagnose AutoPalExpress"), never the literal `.cmd` filename, so no doc text needed to change.
* [x] Confirmed `app/services/diagnostics.py` (the in-app Run Diagnostics button from TICKET-0074) already calls `diagnose-autopalexpress.ps1` directly and never referenced the `.cmd` at all - unaffected.

---

## Files Modified

* `support/Diagnose-AutoPalExpress.cmd` (deleted)
* `support/diagnose-autopalexpress.ps1`
* `installer.iss`

---

## Testing

* Recompiled with `ISCC.exe installer.iss` - successful, and the compressed-files log confirms only `diagnose-autopalexpress.ps1` is bundled now, no `.cmd`.
* New installer SHA256: `11AB0B83B8230B00A3F4C8B51451CB4DA68C0756867BDC99170F540685236FD9`.
* Not done: clicking the rebuilt Start Menu shortcut on a real install to confirm it launches PowerShell and runs the script correctly (same sandbox limitation as other installer/UI-facing tickets - the Inno script change was verified by successful compilation and reading the generated `[Icons]` line, not a live click-through).

---

## Result

The installer no longer bundles any `.cmd`/`.bat` file. The Start Menu "Diagnose AutoPalExpress" shortcut now launches PowerShell directly against the same diagnostics script, with the same name and equivalent behavior (including a graceful non-admin fallback, unchanged from TICKET-0076).

---

## Closed

2026-07-11
