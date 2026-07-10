# TICKET-0058

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

Adjust World Settings boolean fields so the real setting name appears as the field header, while the toggle box text reads `Enable` or `Disable`.

---

## Reason

Toggle controls still looked visually different from number/dropdown controls because the setting name was inside the box instead of in the header position.

---

## Implementation Plan

* [x] Keep the setting label above boolean controls.

* [x] Replace the text inside boolean toggle boxes with `Enable` or `Disable`.

* [x] Verify the frontend build.

* [x] Update changelog and memory.

---

## Files Modified

* `web/src/pages/WorldSettings.tsx`
* `CHANGELOG.md`
* `.claude/memory/project_memory.md`
* `.claude/memory/ticket_memory.md`

---

## Testing

* `npm.cmd run build` from `web/`

---

## Result

World Settings boolean fields keep their setting name in the header position and show `Enable` or `Disable` inside the toggle box.

---

## Notes

Frontend-only World Settings polish.

---

## Closed

2026-07-10
