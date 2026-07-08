# TICKET-0036

**Status**

Closed

**Type**

Enhancement

**Priority**

High

**Created**

2026-07-08

---

## Description

Move launcher flag controls into a dedicated sidebar page named Launcher Flags.

---

## Reason

The previous placements in Settings and World Settings were not discoverable enough. Launcher arguments should have one clear home in the main navigation.

---

## Implementation Plan

* [x] Add a Launcher Flags page and sidebar route.

* [x] Move all launch-argument controls there, including Community Server listing.

* [x] Remove launch-argument controls from Settings and World Settings.

* [x] Update docs, memory, changelog, and ticket notes.

---

## Files Modified

* `web/src/App.tsx`
* `web/src/components/layout/Sidebar.tsx`
* `web/src/components/layout/TopBar.tsx`
* `web/src/pages/LauncherFlags.tsx`
* `web/src/pages/WorldSettings.tsx`
* `web/src/components/settings/InstanceManagerPanel.tsx`
* `app/routes/server_settings.py`
* `web/src/api/serverSettingsApi.ts`
* `web/src/types/models.ts`
* `README.md`
* `CHANGELOG.md`
* `.claude/memory/architecture.md`
* `.claude/memory/decisions.md`
* `.claude/memory/project_memory.md`
* `.claude/memory/ticket_memory.md`

---

## Testing

* Passed: `npm.cmd run build`
* Passed: `py -3.12 -m compileall app\routes\server_settings.py`

---

## Result

Launcher Flags is now a dedicated super-admin-only sidebar page. It is the only visible editor for:

* Show in Community Server list
* Performance launch flags
* Worker thread override
* JSON log format

Settings and World Settings no longer render launcher flag controls.

---

## Notes

The controls still persist on the server instance and take effect on next server start.

---

## Closed

2026-07-08
