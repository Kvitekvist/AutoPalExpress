# TICKET-0078

**Status**

Closed

**Type**

Feature

**Priority**

High

**Created**

2026-07-11

---

## Description

Add an Enable/Disable control for Steam Query Port and make it disabled by default.

---

## Reason

The user does not want `-queryport` enabled automatically. It should be an explicit opt-in launcher option because same-port or unnecessary query-port configuration can create confusing server-port behavior.

---

## Implementation Plan

* [x] Add per-instance `useQueryPort` storage, defaulting to `false`.

* [x] Only append `-queryport=<port>` during launch when `useQueryPort` is enabled.

* [x] Expose the toggle through Launcher Options.

* [x] Make Super Admin firewall/UPnP query-port steps apply only when the toggle is enabled.

* [x] Verify backend/frontend builds.

* [x] Update changelog and memory.

---

## Files Modified

* `app/services/instance_store.py`
* `app/services/process_manager.py`
* `app/routes/instances.py`
* `app/routes/network.py`
* `web/src/pages/LauncherFlags.tsx`
* `web/src/components/settings/PortForwardPanel.tsx`
* `web/src/api/instancesApi.ts`
* `web/src/types/models.ts`
* `CHANGELOG.md`
* `.claude/memory/architecture.md`
* `.claude/memory/project_memory.md`
* `.claude/memory/ticket_memory.md`

---

## Testing

* Passed: `.venv312\Scripts\python.exe -m compileall app`
* Passed: `npm.cmd run build`

---

## Result

Steam Query Port is now default-off. AutoPalExpress only launches with `-queryport` and shows query-port firewall/UPnP steps after the super admin enables it in Launcher Options.

---

## Closed

2026-07-11
