# TICKET-0048

**Status**

Closed

**Type**

Bug

**Priority**

High

**Created**

2026-07-09

---

## Description

Fix Palworld REST calls returning Unauthorized when `AdminPassword` is empty.

---

## Reason

Palworld starts the REST API when `RESTAPIEnabled=True`, but the endpoints still require HTTP Basic Auth using the server's `AdminPassword`. If the password is blank, AutoPalExpress can reach the endpoint but every REST-backed feature fails with Unauthorized.

---

## Implementation Plan

* [x] Generate an `AdminPassword` only when the live ini is missing or blank.
* [x] Preserve user-set admin passwords.
* [x] Preserve the live PalWorldSettings.ini while enforcing REST settings.
* [x] Stop trying REST with a known-empty password and show a useful setup message instead.
* [x] Update docs/memory and verify backend/frontend/installer builds.

---

## Files Modified

* `app/services/palworld_settings.py`
* `app/services/process_manager.py`
* `app/services/palworld_rest.py`
* `README.md`
* `CHANGELOG.md`
* `.claude/memory/project_memory.md`
* `.claude/memory/ticket_memory.md`

---

## Testing

* Passed: `.venv312\Scripts\python.exe -m py_compile app\services\palworld_settings.py app\services\process_manager.py app\services\palworld_rest.py`
* Passed: focused validation that blank `AdminPassword` is replaced, REST remains enabled on the configured port, and unrelated ini fields are preserved.
* Passed: focused validation that an existing non-empty `AdminPassword` is preserved.
* Passed: `npm.cmd run build` from `web\`
* Passed: `powershell -ExecutionPolicy Bypass -File .\build_installer.ps1`
* New installer SHA-256: `59DC70DB4707C0DBBFFBFF13E9850BF3B59E10111BC18B240904600AD43176F9`
* Note: the first non-elevated installer build reached PyInstaller but Windows denied `ISCC.exe`; rerunning the same build with permission succeeded.
* Note: Vite still reports the existing large-chunk warning after a successful build.

---

## Result

Starting a server through AutoPalExpress now fixes the blank AdminPassword state that causes REST Unauthorized responses, without overwriting user-set admin passwords.
