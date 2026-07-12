# TICKET-0090

**Status**

Closed

**Type**

Feature

**Priority**

Low

**Created**

2026-07-12

---

## Description

Add a small, understated donation button to the bottom-left sidebar. Submit the provided PayPal donation fields, but replace PayPal's stock image button and tracking pixel with a project-styled control.

---

## Implementation Plan

* [x] Added an accessible PayPal form at the bottom of the sidebar.
* [x] Preserved the provided merchant, item, recurring, and NOK currency fields.
* [x] Used the project's muted stone/gold styling and heart icon.
* [x] Kept the control icon-only when collapsed and quietly labeled at full width.
* [x] Verified lint and production build; updated changelog and project memory.

---

## Testing

* `npm.cmd run lint` passed with five pre-existing warnings unrelated to this change.
* `npm.cmd run build` passed.
* Verified the rendered form contains no remote PayPal image or tracking pixel.

---

## Result

The sidebar has a small “Support the project” control that matches AutoPalExpress and submits the supplied donation details to PayPal without drawing attention away from server controls.

---

## Closed

2026-07-12
