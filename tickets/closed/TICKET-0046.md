# TICKET-0046

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

Make reinstall/update remember the previously used Super Admin game port, and make Launcher Options' `-publicport` read that same remembered port instead of falling back to `8211`.

---

## Reason

The previous fix still let different code paths disagree about which port was authoritative. Some paths read the live `.ini`, while the Super Admin saved port also lives in the instance record. If the stored custom port is lost or ignored, Launcher Options can show `8211` even when the host expects `8213`.

---

## Implementation Plan

* [x] Add a shared instance-store resolver for the authoritative game port.
* [x] Adopt a custom `.ini` port only when the stored instance port is still the default.
* [x] Let a remembered custom instance port win and enforce it back into `PalWorldSettings.ini` on launch.
* [x] Make Launcher Options prefer the Super Admin/network status port for the read-only `-publicport` value.
* [x] Update docs/memory and verify backend/frontend builds.

---

## Files Modified

* `app/services/palworld_settings.py`
* `app/services/instance_store.py`
* `app/routes/instances.py`
* `app/routes/network.py`
* `app/services/process_manager.py`
* `web/src/pages/LauncherFlags.tsx`

---

## Testing

* Passed: `.venv312\Scripts\python.exe -m py_compile app\services\palworld_settings.py app\services\instance_store.py app\routes\instances.py app\routes\network.py app\services\process_manager.py`
* Passed: `npm.cmd run build`
* Passed: `powershell -ExecutionPolicy Bypass -File .\build_installer.ps1`
* New installer SHA-256: `739F2C22E68B60C5B47D5A6C61367CCFE504AA32E96ABFAC7B6C4C202B472C1C`
* Note: the first non-elevated installer build reached PyInstaller but Windows denied `ISCC.exe`; rerunning the same build with permission succeeded.
* Note: Vite still reports the existing large-chunk warning after a successful build.

---

## Result

AutoPalExpress now resolves the active game port through one shared instance-store helper. A remembered custom Super Admin port like `8213` survives reinstall/update and is enforced into the live ini on launch; older records still stuck at `8211` can adopt a custom ini port when found.

---

## Closed

2026-07-09
