# TICKET-0047

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

Fix the Dashboard roster staying empty after the REST API migration even when the Palworld server console shows a player has joined.

---

## Reason

The REST client refused to call Palworld unless it could read a non-empty `AdminPassword` from `PalWorldSettings.ini`, so existing servers could show "REST metrics skipped" even while Palworld had already started its REST API. The roster path was also too strict about player field names, so small REST payload naming differences could drop connected players before they reached the UI.

---

## Implementation Plan

* [x] Let the REST client try the configured or stored management port even when the password field is blank, so real connection/auth errors are reported honestly.
* [x] Normalize REST player payload fields at the API boundary.
* [x] Reuse the same normalized player identity in Dashboard roster and join/leave tracking.
* [x] Update docs/memory and verify backend/frontend builds.

---

## Files Modified

* `app/services/palworld_rest.py`
* `app/services/player_history.py`
* `app/routes/players.py`
* `app/services/scheduler.py`
* `README.md`
* `CHANGELOG.md`
* `.claude/memory/project_memory.md`
* `.claude/memory/ticket_memory.md`

---

## Testing

* Passed: `.venv312\Scripts\python.exe -m py_compile app\services\palworld_rest.py app\services\player_history.py app\routes\players.py app\services\scheduler.py`
* Passed: local normalizer sanity check for a snake_case REST player payload shaped like the connected player shown in the server console.
* Passed: `npm.cmd run build` from `web\`
* Passed: `powershell -ExecutionPolicy Bypass -File .\build_installer.ps1`
* New installer SHA-256: `650B493B8A108A33F9EFFDD25C440DFEFBDC47953A96DE4F553948689180C243`
* Note: the first non-elevated installer build reached PyInstaller but Windows denied `ISCC.exe`; rerunning the same build with permission succeeded.
* Note: Vite still reports the existing large-chunk warning after a successful build.

---

## Result

Dashboard roster and scheduler join/leave tracking now consume normalized REST player records. If the ini config read is incomplete but the instance still has a stored REST management port, AutoPalExpress tries that local port and lets a real connection/auth result decide what message to show.
