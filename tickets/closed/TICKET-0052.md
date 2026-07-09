# TICKET-0052

**Status**

Closed

**Type**

Feature

**Priority**

High

**Created**

2026-07-10

---

## Description

Add a user-runnable diagnostics command file that produces a clear support verdict for common AutoPalExpress and Palworld server connection failures.

---

## Reason

Users can get stuck without knowing whether the problem is AutoPalExpress setup, the Palworld server process, Windows Firewall, REST API credentials, local port binding, router port forwarding, ISP NAT, or another machine-level issue. Support needs a simple report users can run and send back.

---

## Implementation Plan

* [x] Add a double-clickable command launcher and PowerShell diagnostics script.
* [x] Package the diagnostics files in the Windows installer.
* [x] Document the support tool and update release records.
* [x] Verify the script and rebuild installer artifacts.

---

## Files Modified

* `support/Diagnose-AutoPalExpress.cmd`
* `support/diagnose-autopalexpress.ps1`
* `installer.iss`
* `README.md`
* `CHANGELOG.md`
* `.claude/memory/architecture.md`
* `.claude/memory/project_memory.md`
* `.claude/memory/ticket_memory.md`
* `tickets/closed/TICKET-0052.md`

---

## Testing

* Passed: `powershell -NoProfile -ExecutionPolicy Bypass -File .\support\diagnose-autopalexpress.ps1 -DataDir .\diagnostics-missing-data -ReportDir .\diagnostics-test -NoPause`
* Passed: fixture run with a fake active server registry and ini; correctly detected missing running server/listeners and did not treat firewall-inspection denial as a pass.
* Passed: `powershell -ExecutionPolicy Bypass -File .\build_installer.ps1`
* Updated exe SHA-256: `F6164565F1EC2CD28274D4CF6B898933C7F282797F4B76E60C51C6F411D92BF9`
* Updated installer SHA-256: `C97F70ADD720C577EE694A676E3DA0CCF5DE3B94AA93613FEF276AB611879281`
* Note: the first non-elevated installer build reached PyInstaller but Windows denied `ISCC.exe`; rerunning the same build with permission succeeded.
* Note: Vite still reports the existing large-chunk warning after a successful build.

---

## Result

Users now get a Start Menu/install-folder diagnostics command that produces a clear support report for local setup, process, port, firewall, and REST API problems. If local checks pass, the report points support toward router forwarding, double NAT/CGNAT, wrong public IP, or upstream firewall as the likely remaining cause.

---

## Notes

---

## Closed

2026-07-10
