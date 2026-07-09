# TICKET-0045

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

Fix Launcher Options showing the default `8211` public port after the host has set the server game port to another value, such as `8213`.

---

## Reason

The `-publicport` display was able to fall back to the instance's originally stored `gamePort`, which can be stale when the live `PalWorldSettings.ini` has the real current `PublicPort`. Launcher Options must show the same effective port the server will launch with.

---

## Implementation Plan

* [x] Return the effective live game port in instance API views.
* [x] Prefer that effective port in Launcher Options' read-only `-publicport` field.
* [x] Sync stale stored instance ports when network status resolves the live `.ini` port.
* [x] Update docs/memory and verify backend/frontend builds.

---

## Files Modified

* `app/routes/instances.py`
* `app/routes/network.py`
* `web/src/types/models.ts`
* `web/src/pages/LauncherFlags.tsx`

---

## Testing

* Passed: `.venv312\Scripts\python.exe -m py_compile app\routes\instances.py app\routes\network.py`
* Passed: `npm.cmd run build`
* Passed: `powershell -ExecutionPolicy Bypass -File .\build_installer.ps1`
* New installer SHA-256: `4849C5BD3A46DFE7A6C5CC873C7172F7157815C0C461E8F5FD71D1780F1EA216`
* Note: the first non-elevated installer build reached PyInstaller but Windows denied `ISCC.exe`; rerunning the same build with permission succeeded.
* Note: Vite still reports the existing large-chunk warning after a successful build.

---

## Result

Launcher Options now reads `instance.effectiveGamePort` for the disabled `-publicport` value. The backend computes that from the live server `.ini`, so a server set to `8213` will display `8213` instead of falling back to `8211`.

---

## Closed

2026-07-09
