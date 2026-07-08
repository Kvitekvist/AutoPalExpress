# TICKET-0031

**Status**

Closed

**Type**

Feature

**Priority**

Medium

**Created**

2026-07-08

---

## Description

Allow the super admin to choose where newly deployed Palworld Dedicated Server installs are stored instead of always forcing them under AutoPalExpress' own data `servers` folder.

---

## Reason

Users may want large server installs and world data on a different drive or storage volume. The current default is safe and simple, but too rigid for machines with limited system-drive space.

---

## Implementation Plan

* [x] Add a super-admin-only browse endpoint for selecting a deployment parent folder.
* [x] Let `/api/instances/deploy` accept an optional install parent folder while keeping the generated per-server folder name safe.
* [x] Update the deploy wizard to show the default location and allow choosing a custom location.
* [x] Carry the same option through the installer first-server seed flow.
* [x] Update project records, docs, and verification.

---

## Files Modified

* `app/routes/instances.py`
* `app/services/deploy_jobs.py`
* `app/services/first_run_setup.py`
* `web/src/api/instancesApi.ts`
* `web/src/components/settings/DeployServerWizard.tsx`
* `installer.iss`
* `README.md`
* `CHANGELOG.md`
* `.claude/memory/architecture.md`
* `.claude/memory/decisions.md`
* `.claude/memory/project_memory.md`
* `.claude/memory/ticket_memory.md`
* `tickets/TICKET-0031.md`

---

## Testing

* `npm.cmd run build`
* `py -3.12 -m compileall app\routes\instances.py app\services\deploy_jobs.py app\services\first_run_setup.py`
* Inno Setup compile of `installer.iss`

---

## Result

Super admins can now choose a parent install location when deploying a fresh Palworld server. AutoPalExpress still creates the final server folder from the sanitized server name, and the installer first-server flow can write the chosen parent folder into `first_run_seed.json`.

---

## Notes

The Inno Setup compile was used to verify installer script syntax against the existing `dist\PalworldServerAdmin.exe`; a full release rebuild/checksum refresh was not performed in this ticket.

---

## Closed

2026-07-08
