# TICKET-0098

**Status**

Closed

**Type**

Documentation

**Priority**

Low

**Created**

2026-07-12

---

## Description

User asked for a `wiki` folder with one article per sidebar menu page, with screenshot placeholders pointing at an `images/wiki` folder the user will fill in later, then wanted the wiki pages pushed. Pre-approved in advance since the user was stepping away.

---

## Implementation Plan

* [x] Created `wiki/` with one article per sidebar page (9 pages total, matching `web/src/components/layout/Sidebar.tsx`'s `COMMON_ITEMS`/`HOST_ITEMS` and their real i18n labels): `dashboard.md`, `mods.md`, `server-control.md`, `world-settings.md`, `logs.md`, `mod-wishlist.md`, `launcher-options.md`, `settings.md`, `super-admin.md`.
* [x] Added `wiki/README.md` as an index linking all articles, grouped the same way the sidebar groups them (common pages vs. Host Controls/super-admin-only pages).
* [x] Each article's content was written from the actual page components (`web/src/pages/*.tsx`), not guessed - describes real controls/sections that exist today.
* [x] Each article has a screenshot placeholder image reference at `images/wiki/<page-slug>.png` with a visible "placeholder" caption, plus created the `images/wiki/` folder (via `.gitkeep`, since git doesn't track empty directories) for the user to drop real screenshots into later.
* [x] Committed and pushed to `origin/main`.

---

## Files Modified

* `wiki/README.md` (new)
* `wiki/dashboard.md` (new)
* `wiki/mods.md` (new)
* `wiki/server-control.md` (new)
* `wiki/world-settings.md` (new)
* `wiki/logs.md` (new)
* `wiki/mod-wishlist.md` (new)
* `wiki/launcher-options.md` (new)
* `wiki/settings.md` (new)
* `wiki/super-admin.md` (new)
* `images/wiki/.gitkeep` (new)

---

## Testing

* Reviewed each article by eye against its real page component for accuracy; no build step applies to Markdown-only changes.

---

## Result

`wiki/` now has one accurate article per sidebar page, each with a screenshot placeholder ready for the user to fill in under `images/wiki/`. Pushed to `origin/main`.

---

## Closed

2026-07-12
