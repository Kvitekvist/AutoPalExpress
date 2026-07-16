# TICKET-0161

**Status**

Closed

**Type**

Enhancement

**Priority**

Low

**Created**

2026-07-16

---

## Description

Remove the floating "magic wand" quick-actions button (bottom-right corner of every page) entirely.

---

## Reason

Direct user request: "i wanna comepltle remov e the magic wand icon down right."

---

## Implementation Plan

* [x] Remove `<FloatingActionOrb>` usage from `AppShell.tsx`.
* [x] Delete the now-unused `web/src/components/fantasy/FloatingActionOrb.tsx`.

---

## Files Modified

* `web/src/components/layout/AppShell.tsx` - removed the `FloatingActionOrb` import/render and its now-unused `Save`/`Swords`/`ScrollText` icon imports and `handleQuickSave` handler (the Save World/Server Control/View Logs shortcuts it offered aren't duplicated elsewhere - Server Control and Logs are still reachable from the Sidebar, and World Settings/Server Control both have their own explicit Save actions).
* `web/src/components/fantasy/FloatingActionOrb.tsx` - deleted (no longer referenced anywhere).

---

## Testing

`npm run build`/`npm run typecheck`/`npm run lint` clean. Manual visual confirmation not done - same sandbox limitation as the rest of this project's UI work (no interactive browser session available here).

---

## Result

The floating orb button and its expand/collapse quick-actions menu no longer render anywhere in the app.

---

## Notes

None.

---

## Closed

2026-07-16
