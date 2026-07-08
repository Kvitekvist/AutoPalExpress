# TICKET-0034

**Status**

Closed

**Type**

Enhancement

**Priority**

Medium

**Created**

2026-07-08

---

## Description

Move the new Palworld launch-option controls from Settings into World Settings.

---

## Reason

The host expects server behavior/configuration controls to live in World Settings. Keeping the performance flags, worker thread override, and JSON log format there makes them easier to find while still preserving the rule that each setting is only editable in one place.

---

## Implementation Plan

* [x] Add a World Settings launch-options panel for the active server.

* [x] Remove the duplicate launch-options controls from Server Instances.

* [x] Keep the existing super-admin-only backend permission for changing launch options.

* [x] Update docs, memory, changelog, and verification notes.

---

## Files Modified

* `web/src/pages/WorldSettings.tsx`
* `web/src/components/settings/InstanceManagerPanel.tsx`
* `CHANGELOG.md`
* `.claude/memory/architecture.md`
* `.claude/memory/decisions.md`
* `.claude/memory/project_memory.md`
* `.claude/memory/ticket_memory.md`

---

## Testing

* Passed: `npm.cmd run build`

---

## Result

World Settings now includes a Launch Options panel for the active server. The Settings server-instance cards no longer contain performance flags, worker thread override, or JSON log format, preserving one visible editor for each setting.

---

## Notes

Community Server listing remains in Settings for now because it was not part of the requested move.

---

## Closed

2026-07-08
