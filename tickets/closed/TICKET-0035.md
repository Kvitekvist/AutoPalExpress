# TICKET-0035

**Status**

Closed

**Type**

Bug

**Priority**

High

**Created**

2026-07-08

---

## Description

World Settings does not show the new Launch Options panel even when a server is selected and World Settings fields load correctly.

---

## Reason

The page loads Palworld `.ini` fields from `/api/server-settings`, but loads launch-option state through a separate active-instance request. If that second request fails or does not populate state, the launch panel is hidden even though the page has already proven that an active server exists.

---

## Implementation Plan

* [x] Include the active server's launch-option state in the existing World Settings API response.

* [x] Render the World Settings Launch Options panel from that response.

* [x] Keep launch-option writes super-admin-only.

* [x] Update ticket, changelog, and memory.

---

## Files Modified

* `app/routes/server_settings.py`
* `web/src/api/serverSettingsApi.ts`
* `web/src/pages/WorldSettings.tsx`
* `web/src/types/models.ts`
* `CHANGELOG.md`
* `.claude/memory/project_memory.md`
* `.claude/memory/ticket_memory.md`

---

## Testing

* Passed: `npm.cmd run build`
* Passed: `py -3.12 -m compileall app\routes\server_settings.py`

---

## Result

World Settings launch options are now part of the main `/api/server-settings` payload, so the panel renders from the same successful request as the visible Popular/Advanced setting fields.

---

## Notes

The panel should appear between Popular Settings and Advanced Settings.

---

## Closed

2026-07-08
