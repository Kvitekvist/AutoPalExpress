# TICKET-0039

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

Reinstalling or re-importing the same Palworld server can leave duplicate server-instance records pointing at the same server folder. Settings should only show unique servers, and each server row should support switching to it, unregistering it, unregistering and deleting its server files, and opening its folder in Windows Explorer.

---

## Reason

Duplicate entries make it unclear which server is active and can lead the host to manage the same server through multiple stale registry records. The destructive delete action also needs to be explicit and separated from normal unregistering so world-save deletion is never accidental.

---

## Implementation Plan

* [x] Normalize and deduplicate instance records by server path.

* [x] Add backend actions for opening a server folder in Explorer and unregistering with optional server-file deletion.

* [x] Add Settings UI buttons and confirmation flows for switch, remove, remove and delete, and open in Explorer.

* [x] Update project docs and verify backend/frontend builds.

---

## Files Modified

* `app/services/instance_store.py`
* `app/routes/instances.py`
* `web/src/api/instancesApi.ts`
* `web/src/components/settings/InstanceManagerPanel.tsx`
* `README.md`
* `CHANGELOG.md`
* `.claude/memory/project_memory.md`
* `.claude/memory/architecture.md`
* `.claude/memory/ticket_memory.md`

---

## Testing

* Passed: `.venv312\Scripts\python.exe -m py_compile app/services/instance_store.py app/routes/instances.py`
* Passed: `npm.cmd run build`
* Note: Vite still reports the existing large-chunk warning after a successful build.

---

## Result

Server Instances now shows only one row per normalized server folder, and creating/importing the same path again reuses the existing record instead of appending another duplicate. Each server row can switch to that server, open the folder in Windows Explorer, unregister the server without touching files, or unregister and delete the server folder after the server is stopped.

---

## Notes

Remove and Delete is intentionally separate from normal Remove because it deletes mods and world saves in the registered server folder.

---

## Closed

2026-07-09
