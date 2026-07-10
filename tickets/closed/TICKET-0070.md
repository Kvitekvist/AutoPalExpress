# TICKET-0070

**Status**

Closed

**Type**

Enhancement

**Priority**

Low

**Created**

2026-07-10

---

## Description

Give the Sidebar's super-admin-only nav items (Launcher Options, Settings, Super Admin) a distinct "premium/host" visual treatment so the super admin can immediately tell which pages only they can see, instead of those items looking identical to the common ones.

---

## Reason

User: "can you make the super admin side bar menus more premium so i know what menus only i can see."

---

## Implementation Plan

* [x] Split `Sidebar.tsx`'s flat `NAV_ITEMS` list into `COMMON_ITEMS` (visible to every admin) and `HOST_ITEMS` (super-admin-only: Launcher Options, Settings, Super Admin).
* [x] Extracted the per-item rendering into a `NavItem` component with a `host` prop that applies a warmer gold treatment: a small gold crown badge overlaid on the icon circle, a gold-tinted icon border/background, and a brighter active-state glow.
* [x] Added a "Host Controls" section divider (small crown icon + uppercase label + gradient rule) shown above the host-only items, but only when the logged-in user is a super admin - regular admins never see the divider or those items at all (unchanged route/nav guarding from before).
* [x] Added `nav.hostControls` and `nav.hostOnlyBadge` (the crown badge's tooltip/title) translation keys to all 5 non-English locales, consistent with the rest of the i18n work done this session.

---

## Files Modified

* `web/src/components/layout/Sidebar.tsx`
* `web/src/i18n/locales/{de,fr,es,ja,zh-Hans}.json` (added `nav.hostControls`, `nav.hostOnlyBadge`)

---

## Testing

`npm run build` (tsc + vite build) passed clean. Not visually clicked through in a real browser in this sandbox (same standing limitation noted on prior i18n tickets) - worth a quick look next time the app is opened.

---

## Result

Super-admin-only sidebar items now have a small gold crown badge, a warmer gold icon treatment, and sit under a "Host Controls" divider - visually distinct from the common nav items for the super admin, while staying completely invisible to regular admins as before.

---

## Notes

Purely a super-admin-facing visual change - regular admin accounts see no difference at all (superAdminOnly filtering already existed; this ticket only changes how those items look for the super admin who does see them).

---

## Closed

2026-07-10
