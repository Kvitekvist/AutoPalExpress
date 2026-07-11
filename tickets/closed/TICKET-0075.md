# TICKET-0075

**Status**

Closed

**Type**

Bug

**Priority**

High

**Created**

2026-07-11

---

## Description

Fix Palworld starting on the Steam query port instead of the configured game port after adding `-queryport`.

---

## Reason

The backend logs showed AutoPalExpress launching the active server with game port `8213`, while the Palworld server window reported it was running on `8214`. The user found the real cause while testing: if Steam Query Port is the same as the Palworld game port, Steam query binds that UDP port first and Palworld moves the game server to the next open port.

So the feature is valid, but AutoPalExpress must never allow `-queryport` to equal `-port` or another registered server's game port.

---

## Implementation Plan

* [x] Keep `-queryport` in the launch command, but guarantee it is distinct from the game port.

* [x] Migrate old same-port/default values to a nearby safe query port.

* [x] Block invalid query-port saves in the backend and show a clear Launcher Options warning.

* [x] Keep Super Admin's firewall/UPnP checklist aware of the separate query port.

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
* `CHANGELOG.md`
* `.claude/memory/project_memory.md`
* `.claude/memory/architecture.md`
* `.claude/memory/decisions.md`
* `.claude/memory/ticket_memory.md`

---

## Testing

* Passed: `.venv312\Scripts\python.exe -m compileall app`
* Passed: `npm.cmd run build`

---

## Result

Steam query port now defaults to a port separate from the game port, existing bad values are corrected during instance cleanup/startup, and Palworld should no longer move the game server from `8213` to `8214` because the query port stole `8213`.

---

## Notes

The query port is a separate UDP service used for Steam/server-list discovery. It may need its own firewall/router rule when users want community/server-list visibility.

---

## Closed

2026-07-11
