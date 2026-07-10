# TICKET-0064

**Status**

Closed

**Type**

Documentation

**Priority**

Low

**Created**

2026-07-10

---

## Description

`NEXUS_DESCRIPTION.md` had drifted from `GETTING_STARTED.md`: it described
installation and first-time setup in a few short paragraphs while
`GETTING_STARTED.md` had grown into a full numbered walkthrough with
screenshots, tips, warnings, and a Quick Fixes section. Rewrote
`NEXUS_DESCRIPTION.md`'s setup instructions to match `GETTING_STARTED.md`
step for step, converted to Nexus BBCode (Nexus's description editor does
not render Markdown).

## Reason

User request: keep the Nexus mod page description in sync with the
GitHub-facing Getting Started guide, in the markup Nexus actually requires.

---

## Implementation Plan

* [x] Convert `GETTING_STARTED.md`'s numbered walkthrough (install, admin
      account, add server, start, let friends join, community server
      listing, world settings, mods, invite friends, diagnostics, quick
      fixes) into Nexus BBCode and use it to replace the old, much shorter
      Installation/First-Time Setup/Troubleshooting sections.
* [x] Convert GitHub-flavored Markdown alert blocks (`[!TIP]`, `[!NOTE]`,
      `[!WARNING]`) to Nexus `[quote]` blocks with a bold label, since Nexus
      BBCode has no native equivalent.
* [x] Handle images: `GETTING_STARTED.md`'s relative `images/...png` paths
      don't work on Nexus, so each `[img]` tag uses a clear
      `PASTE-NEXUS-IMAGE-URL: <filename>` placeholder naming the exact
      existing screenshot to upload to Nexus's own image gallery, instead of
      silently breaking or omitting screenshots entirely.
* [x] Keep the sections `GETTING_STARTED.md` never covered but a Nexus mod
      page needs (feature overview, Security/Remote Access, Requirements,
      Known Limitations, Support, Credits, Changelog) - the request was to
      match the setup walkthrough content, not strip the page down to only
      that.

---

## Files Modified

* `NEXUS_DESCRIPTION.md`

---

## Testing

Read through the rewritten file end to end to confirm every BBCode tag is
opened and closed correctly ([size], [b], [list]/[/list], [quote], [img],
[code], [hr]) and that every step from `GETTING_STARTED.md` has a
corresponding section. Did not paste into Nexus's actual live editor to
render-check it - no access to the mod page's edit form from here - so a
before-publishing preview in Nexus's own editor is still worth doing once,
same caution as any hand-written BBCode.

---

## Result

`NEXUS_DESCRIPTION.md` now carries the same step-by-step setup walkthrough as
`GETTING_STARTED.md`, formatted in Nexus BBCode with placeholder image URLs
ready to be swapped in after uploading the existing screenshots to Nexus's
gallery.

## Notes

Whenever `GETTING_STARTED.md` gets a real content edit (steps added/removed,
not just wording), `NEXUS_DESCRIPTION.md` should get the same edit converted
to BBCode - the two are meant to stay in lockstep now, not just at this one
point in time.

---

## Closed

2026-07-10
