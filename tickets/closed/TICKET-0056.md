# TICKET-0056

**Status**

Closed

**Type**

Bug

**Priority**

Medium

**Created**

2026-07-10

---

## Description

Fix World Settings layout polish: boolean toggle controls are visually misaligned with numeric/dropdown inputs, and category headings show an unwanted long divider line after the label.

---

## Reason

Grouped World Settings should scan cleanly. Toggles should follow the same label/control rhythm as other fields, and category headings should not add decorative lines that make sections look cluttered.

---

## Implementation Plan

* [x] Remove the horizontal filler line after category headings.

* [x] Render boolean fields with the same label-above-control layout as inputs and dropdowns.

* [x] Verify the frontend build.

* [x] Update changelog and memory.

---

## Files Modified

* `web/src/pages/WorldSettings.tsx`
* `README.md`
* `CHANGELOG.md`
* `.claude/memory/project_memory.md`
* `.claude/memory/architecture.md`
* `.claude/memory/ticket_memory.md`

---

## Testing

* `npm.cmd run build` from `web/`

---

## Result

World Settings category headings no longer render a long horizontal line after the label. Boolean settings now use the same label-above-control layout as numeric and dropdown fields, so toggle rows align cleanly in grouped sections.

---

## Notes

This is a frontend-only World Settings layout fix.

---

## Closed

2026-07-10
