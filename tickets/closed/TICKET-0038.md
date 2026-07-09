# TICKET-0038

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

Restore direct Nexus Mods installation so the super admin can install a mod from Nexus without manually downloading and uploading the archive first.

---

## Reason

The old Nexus API integration supported direct installation. The current public GraphQL browsing flow still works for metadata and verified manual uploads, but the user wants the one-click install path reintroduced for installs that have a connected Nexus API key.

---

## Implementation Plan

* [x] Re-enable backend direct install from Nexus using the stored API key and Nexus download-link endpoint.

* [x] Select a safe installable file, download it into app data, install with the existing zip safety checks, and update mod records.

* [x] Restore the Mods page card action for direct install while keeping View on Nexus and manual upload fallback.

* [x] Update docs, memory, changelog, and ticket records.

* [x] Verify backend compile and frontend build.

---

## Files Modified

* `app/routes/mods.py`
* `app/services/nexus_client.py`
* `web/src/api/modsApi.ts`
* `web/src/components/mods/NexusBrowseDialog.tsx`
* `web/src/components/mods/NexusModBrowser.tsx`
* `web/src/components/mods/NexusModCard.tsx`
* `web/src/components/settings/NexusIntegrationPanel.tsx`
* `web/src/pages/Mods.tsx`
* `web/src/types/models.ts`
* `README.md`
* `NEXUS_DESCRIPTION.md`
* `CHANGELOG.md`
* `.claude/memory/project_memory.md`
* `.claude/memory/architecture.md`
* `.claude/memory/decisions.md`
* `.claude/memory/ticket_memory.md`

---

## Testing

* Passed `npm.cmd run build`.
* Passed `py -3.12 -m compileall app\routes\mods.py app\routes\nexus.py app\services\nexus_client.py`.

---

## Result

Direct Nexus installs are back for super admins with a saved Nexus Premium API key. The Mods page shows an Install button in Nexus Browse for eligible super admins, downloads the selected Nexus file through the backend, installs it with the existing archive safety checks, and updates/replaces the mod record.

---

## Notes

Public Nexus browsing still works without an API key. Users without Premium download access still use View on Nexus plus Super Admin's verified Install From File workflow.

---

## Closed

2026-07-09
