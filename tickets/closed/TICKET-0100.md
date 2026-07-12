# TICKET-0100

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

User feedback on TICKET-0098/0099's wiki pages: too generic ("what you can do here" bullet lists). Wanted them rewritten as step-by-step "for dummies" how-to guides, with more screenshot placeholders that call out specifically what to highlight in each shot, rather than one generic overview screenshot per page.

---

## Implementation Plan

* [x] Rewrote all 9 pages (in both the main repo's `wiki/` folder and the live GitHub Wiki) from feature-list style into numbered "How do I...?" sections, each answering one concrete task a user would actually want to do on that page.
* [x] Replaced each page's single generic screenshot with several placeholders per page (one per major step), each with an explicit instruction on what to circle/highlight (e.g. "circle the Start Server tile and its Change dropdown") instead of just "a screenshot of this page."
* [x] Used a numbered filename convention per page (`<page>-01-...png`, `<page>-02-...png`, etc.), matching the project's existing `GETTING_STARTED.md`/wiki Getting-Started page convention.
* [x] Kept the two docs in sync: main-repo `wiki/*.md` uses `../images/wiki/<file>.png` and `page.md` links; the live GitHub Wiki uses `images/<file>.png` and `[[Page Name]]` links, matching each venue's own image/link convention (the live wiki's pre-existing Getting Started page already established the wiki-local `images/` pattern).
* [x] Pushed both.

---

## Files Modified

* `wiki/dashboard.md`, `wiki/mods.md`, `wiki/server-control.md`, `wiki/world-settings.md`, `wiki/logs.md`, `wiki/mod-wishlist.md`, `wiki/launcher-options.md`, `wiki/settings.md`, `wiki/super-admin.md` (main repo)
* `AutoPalExpress.wiki.git`: same 9 pages (separate repo, not part of this repo's tree)

---

## Testing

* Reviewed each page by eye against the real page component it documents, for accuracy of button/panel names.

---

## Result

Every sidebar wiki page (both the in-repo copy and the live GitHub Wiki) now reads as a concrete "how do I do X" walkthrough with a specific screenshot placeholder per step, instead of a generic feature list with one overview image.

---

## Closed

2026-07-12
