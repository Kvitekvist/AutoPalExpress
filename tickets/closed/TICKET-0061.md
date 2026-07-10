# TICKET-0061

**Status**

Closed

**Type**

Enhancement

**Priority**

Medium

**Created**

2026-07-10

---

## Description

Palworld's dedicated server config schema has grown since World Settings' curated
metadata (TICKET-0053/0054) was written. Diffed the live, currently-installed
`DefaultPalWorldSettings.ini` (Steam build 24088465) against
`app/services/palworld_settings.py`'s curated field metadata: 119 real fields exist,
62 have curated labels/groups/help, 57 don't. Nothing is broken - unknown fields
already render as generic auto-labeled entries in an "Other" group - but a
meaningful subset of the 57 are real gameplay/admin knobs worth the same
grouped/tooltipped treatment as the existing fields, not just internal engine
tuning.

Also found two things needing care, not just addition:
* `bPalLost` is now Palworld's own separate "lose Pals forever on death" toggle,
  distinct from `bHardcore`. The existing `bHardcore` help text claims that
  behavior itself and is now inaccurate.
* `PublicIP` is a real ini field with no curated metadata, but AutoPalExpress
  already owns the public-IP override flow through Launcher Options'
  `usePublicIpOverride` (`-publicip=` launch arg, TICKET-0044). Exposing the raw
  ini field in World Settings would reopen the "two places to edit the same
  thing" problem TICKET-0044-0046 deliberately closed for the game port.

## Reason

User asked to check whether Palworld's config file changed after a game update
and whether the admin panel's server-settings interface needs updating to match.

---

## Implementation Plan

* [x] Diff live `DefaultPalWorldSettings.ini` against curated metadata to find
      what's actually new (not just what the public docs page describes).
* [x] Add curated label/group/help metadata for the meaningful subset of new
      fields (guild settings, voice chat range, PvP damage/kill-drop config,
      stat-point-allocation locks, respawn penalty tuning, native join/leave
      message toggle, Global Palbox import/export, etc.). Leave genuinely
      internal/anti-cheat/client-input fields (`bUseAuth`, `BanListURL`,
      `bActiveUNKO`, aim-assist toggles, tick-interval tuning knobs) in the
      generic fallback.
* [x] Fix `bHardcore`'s help text now that `bPalLost` is the actual Pal-loss
      toggle; add `bPalLost` with the description `bHardcore` used to have.
* [x] Add `PublicIP` to `_MANAGED_ELSEWHERE` so it's hidden from the generic
      World Settings editor, matching `PublicPort`'s existing precedent, since
      Launcher Options already owns public IP.
* [x] Verify the frontend renders the new groups/fields correctly.
* [x] Update documentation and ticket memory.

---

## Files Modified

* `app/services/palworld_settings.py`
* `CHANGELOG.md`

---

## Testing

* Diffed curated metadata keys against the live `DefaultPalWorldSettings.ini`
  from the actually-installed Palworld Dedicated Server (Steam build
  `24088465`) via a throwaway script - curated coverage went from 62/119 to
  103/119 real fields; the remaining 16 uncurated fields are exactly the
  intentionally-excluded internal/anti-cheat/client-input set.
* Called `palworld_settings.read_all_settings()` directly against a real,
  currently-configured live server instance (`test2`, `D:\games\TestServer1`)
  - confirmed new fields render with correct type/group/label, `PublicIP` and
  `PublicPort` are absent from the result, and the previously-existing "Other"
  fallback bucket contains only the intended internal fields.
* Confirmed a real write/read round-trip through `write_settings` for a newly
  curated field (`bPalLost`) against that same live ini, then reverted it.
* `python -c "import ast; ast.parse(...)"` for a clean syntax check, and
  `npm run build` in `web/` to confirm the frontend (a generic
  group/label/help-driven renderer with no field-specific code) still builds
  without changes.

---

## Result

World Settings now has curated grouping, labels, and help text for the real
gameplay-relevant settings Palworld's dedicated server added since the
existing curated metadata was written, verified against a real live server's
config rather than only the public docs page. `PublicIP` no longer risks
becoming a second, inert place to "set the public IP" alongside Launcher
Options.

---

## Notes

The official docs page (docs.palworldgame.com) turned out to be an incomplete
and imperfect source for this - it omitted some real fields the live installed
game actually writes (e.g. `BuildObjectHpRate`, `PhysicsActiveDropItemMaxNum`
placement) and it can't reflect the exact version installed. The live
`DefaultPalWorldSettings.ini` that ships with the installed server is the
authoritative source; this matches what `palworld_settings.py`'s own existing
design comment already says about the template being "always matches the
installed version" - the diff should be done against that file directly next
time this comes up, not the docs page alone.

---

## Closed

2026-07-10
