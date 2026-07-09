# TICKET-0044

**Status**

Closed

**Type**

Feature

**Priority**

High

**Created**

2026-07-09

---

## Description

Add Palworld `-publicip` and `-publicport` launcher overrides for community-server listing troubleshooting, while keeping the actual IP and port values owned by Super Admin.

---

## Reason

Palworld's official server arguments call out manual public IP and public port overrides when community-server detection does not work correctly. AutoPalExpress already owns the public address and game port through Super Admin's Share With Friends/networking flow, so Launcher Options should only enable the flags and show the derived values read-only.

---

## Implementation Plan

* [x] Add per-instance `-publicip` and `-publicport` enable flags.
* [x] Keep Launcher Options route and write API super-admin-only.
* [x] Show read-only public IP and game port values sourced from the existing Super Admin networking flow.
* [x] Append `-publicip=<detected public IP>` and `-publicport=<active game port>` on server launch when enabled.
* [x] Update docs/memory and verify backend/frontend builds.

---

## Files Modified

* `app/services/public_ip.py`
* `app/services/instance_store.py`
* `app/routes/instances.py`
* `app/services/process_manager.py`
* `web/src/types/models.ts`
* `web/src/api/instancesApi.ts`
* `web/src/pages/LauncherFlags.tsx`

---

## Testing

* Passed: `.venv312\Scripts\python.exe -m py_compile app\services\public_ip.py app\services\instance_store.py app\routes\instances.py app\services\process_manager.py`
* Passed: `npm.cmd run build`
* Passed: `powershell -ExecutionPolicy Bypass -File .\build_installer.ps1`
* New installer SHA-256: `BB415DF6CFD8163FF406C7C1C023CCF1F3C69E7B510BE43E369CE4A70EE88AE2`
* Note: the first non-elevated installer build reached PyInstaller but Windows denied `ISCC.exe`; rerunning the same build with permission succeeded.
* Note: Vite still reports the existing large-chunk warning after a successful build.

---

## Result

Launcher Options now includes `-publicip` and `-publicport` toggles. The visible values are disabled/read-only and come from Super Admin's public IP/game-port source. On start, enabled overrides append the detected public IP and effective game port to the Palworld launch command.

---

## Closed

2026-07-09
