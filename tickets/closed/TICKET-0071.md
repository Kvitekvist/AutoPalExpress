# TICKET-0071

**Status**

Closed

**Type**

Bug

**Priority**

Low

**Created**

2026-07-10

---

## Description

Super Admin's Local API panel renders its one boolean field ("REST API Enabled") with the field name placed *inside* the toggle box, instead of as a title above it with "Enable"/"Disable" wording inside the box - inconsistent with World Settings' boolean fields, which already got this exact fix in TICKET-0058.

---

## Reason

User: under Super Admin > Local API, put the field name as a title above the REST API Enabled toggle, and "Enable or Disable" wording inside the box.

---

## Implementation Plan

* [x] `LocalApiSettingsPanel.tsx`'s `LocalApiField` bool branch: wrap in the same `<Label>` (field name) + `EnchantedToggle` (with `label` set to translated "Enable"/"Disable" based on current state) layout already used in `WorldSettings.tsx`.

---

## Files Modified

* `web/src/components/settings/LocalApiSettingsPanel.tsx`

---

## Testing

`npm run build` (tsc + vite build) passed clean. Not visually confirmed in a real browser in this sandbox (same standing limitation as other UI tickets this session).

---

## Result

The "REST API Enabled" toggle (and any future boolean Local API field) now shows its field name as a title above the toggle box, with "Enable"/"Disable" text inside the box - matching World Settings' layout exactly.

---

## Notes

Only one boolean field currently lives in the "Local API" group (`RESTAPIEnabled`); this fix applies generically to the shared `LocalApiField` renderer, so any future boolean field added there gets the same correct layout automatically.

---

## Closed

2026-07-10
