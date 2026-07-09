# TICKET-0051

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

Rebuild the packaged executable after TICKET-0050.

---

## Reason

The source now includes the ini-preserving port-enforcement fix. The packaged executable and installer need to be refreshed so local release artifacts include that fix.

---

## Implementation Plan

* [x] Rebuild the frontend, packaged executable, and installer.
* [x] Refresh release checksum references.
* [x] Update memory and commit.

---

## Files Modified

* `README.md`
* `.claude/memory/project_memory.md`
* `.claude/memory/ticket_memory.md`

---

## Testing

* Passed: `powershell -ExecutionPolicy Bypass -File .\build_installer.ps1`
* Updated exe SHA-256: `E30DDE4050D05951D4B28B100CECC8D0028CD7B29FC52AAE9D908FD755627CCB`
* Updated installer SHA-256: `1116A3ABE445BC3684415134BCC90FFA819F4FB1948305A426A2F04C74A8E034`
* Note: the first non-elevated installer build reached PyInstaller but Windows denied `ISCC.exe`; rerunning the same build with permission succeeded.
* Note: Vite still reports the existing large-chunk warning after a successful build.

---

## Result

The local packaged executable and installer now include the TICKET-0050 ini-preservation fix.
