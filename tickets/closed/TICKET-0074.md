# TICKET-0074

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

Add a "Run Diagnostics" button to Super Admin that runs the existing bundled diagnostics tool (`support/diagnose-autopalexpress.ps1`, previously only reachable via the separate `Diagnose-AutoPalExpress.cmd` Start Menu shortcut) from inside the app itself, and shows the resulting report right there instead of the user having to go find the shortcut and read a text file.

---

## Reason

User request: a "Run Diagnostics" button in Super Admin that runs the existing diagnostics tool (firewall, port forwarding, REST API, server files, etc.) without leaving the app.

---

## Implementation Plan

* [x] `app/services/diagnostics.py` (new): locates the packaged diagnostics script (path differs between a frozen/installed build - copied directly beside the exe by `installer.iss` - and running from source, where it's under `support/`), runs it elevated via the same `Start-Process -Verb RunAs -Wait` pattern already used by `firewall.add_inbound_rule` (Windows shows its own UAC consent prompt; the user still has to click "Yes" themselves - this only saves them from finding/launching the script by hand), then locates and reads back the report file the script just wrote.
* [x] `app/routes/system_settings.py`: new `POST /api/system-settings/diagnostics` endpoint (already super-admin-gated at the router level, same as Windows Startup Recovery), running the blocking subprocess call via `asyncio.to_thread` so it doesn't block the event loop for up to two minutes.
* [x] `web/src/components/settings/DiagnosticsPanel.tsx` (new) + mounted on `SuperAdmin.tsx`: a "Run Diagnostics" button, a note that a Windows permission prompt will appear, and the full report shown in a scrollable monospace box afterward (plus the saved file path).
* [x] Translated the new panel's strings into all 5 non-English locales.
* [x] Found and fixed a real bug while verifying: PowerShell 5.1's `Tee-Object`/`Out-File` (which `Write-Report` in the diagnostics script pipes through) writes UTF-16 LE with a BOM by default, not UTF-8, even though the file is named `.txt`. The initial implementation read the report as UTF-8, which silently produced garbled text (a substring check for `"Support verdict"` failed against the corrupted content in testing). Fixed by reading with `encoding="utf-16"`.

---

## Files Modified

* `app/services/diagnostics.py` (new)
* `app/routes/system_settings.py`
* `web/src/components/settings/DiagnosticsPanel.tsx` (new)
* `web/src/pages/SuperAdmin.tsx`
* `web/src/api/systemSettingsApi.ts`
* `web/src/i18n/locales/{zh-Hans,ja,de,fr,es}.json`
* `.gitignore` (added `diagnostics/`, the report-output folder used when running from source, matching the existing `data/` entry)

---

## Testing

Manual, against the real project (no automated test suite exists, see `.claude/memory/tech_stack.md`):

* `npm run build` (tsc + vite build) passed clean.
* Ran the real `support/diagnose-autopalexpress.ps1` directly (non-elevated) against the real `data/`/`Tester1` instance twice, confirming it produces a complete, well-formed report (server-file checks, running-process checks, firewall checks, a pass/warn/fail summary).
* Verified the Python side's before/after report-file discovery logic against those real runs.
* Caught the UTF-16-vs-UTF-8 encoding bug this way (a `"Support verdict" in text` check silently returned `False` against the mis-decoded content) and confirmed the fix (`encoding="utf-16"`) makes it return `True` and produce clean, readable text.
* Cleaned up the test `diagnostics/` folder created during verification afterward.
* Not done: actually clicking through a real UAC prompt end-to-end via the app's own button - this sandbox can't drive/observe the interactive desktop session (same limitation as prior tickets, e.g. TICKET-0018/TICKET-0062), and deliberately avoided triggering a real elevation prompt on the user's live desktop from an unattended verification step. The user should click through this once themselves in the rebuilt app.

---

## Result

Super Admin now has a "Run Diagnostics" button that runs the same checks as the Start Menu shortcut, shows the resulting report inline, and fixes a real encoding bug found while building it (the report would have displayed as garbled text otherwise).

---

## Notes

The underlying `Diagnose-AutoPalExpress.cmd` double-click shortcut still exists unchanged for anyone who prefers it or needs to run diagnostics without the app running at all (e.g. the app itself won't start) - this ticket adds a second, more convenient path, not a replacement.

---

## Closed

2026-07-10
