# TICKET-0043

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

Add a Server Control button to check whether the active Palworld Dedicated Server install has a SteamCMD update available. If an update is found, ask the user to confirm before updating.

---

## Reason

Hosts need an in-app upgrade path when Palworld releases a new dedicated-server build. AutoPalExpress already deploys servers through SteamCMD, so upgrades should reuse that mechanism instead of asking users to run SteamCMD manually.

---

## Implementation Plan

* [x] Read the active server's installed Steam build id from SteamCMD's app manifest.

* [x] Query SteamCMD for the current public Palworld Dedicated Server build id.

* [x] Add backend update-check and update-start job endpoints.

* [x] Add a Server Control "Check Updates" button and confirmation dialog.

* [x] Update docs/memory and verify backend/frontend builds.

---

## Files Modified

* `app/services/steamcmd.py`
* `app/services/server_update.py`
* `app/routes/server_control.py`
* `web/src/api/serverApi.ts`
* `web/src/types/models.ts`
* `web/src/pages/ServerControl.tsx`
* `README.md`
* `CHANGELOG.md`
* `.claude/memory/project_memory.md`
* `.claude/memory/architecture.md`
* `.claude/memory/decisions.md`
* `.claude/memory/ticket_memory.md`

---

## Testing

* Passed: `.venv312\Scripts\python.exe -m py_compile app\services\steamcmd.py app\services\server_update.py app\routes\server_control.py`
* Passed: `npm.cmd run build`
* Passed: `powershell -ExecutionPolicy Bypass -File .\build_installer.ps1`
* New installer SHA-256: `3C1F74E39D9DC3DFF7BDD5532ACE2DA64A3C11E361036138E570DAEEBAA77F0E`
* Note: Vite still reports the existing large-chunk warning after a successful build.

---

## Result

Server Control now has a Check Updates button. It compares the active server's installed Steam build id to SteamCMD's current public build id, asks before updating when a newer build is found, and runs the update as a pollable SteamCMD job after the server is stopped.

---

## Closed

2026-07-09
