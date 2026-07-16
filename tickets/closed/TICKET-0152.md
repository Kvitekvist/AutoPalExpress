# TICKET-0152

**Status**

Closed

**Type**

Enhancement

**Priority**

Medium

**Created**

2026-07-16

---

## Description

Curate Palworld's `bUseAuth` ini setting into World Settings with a clear label and help text, instead of leaving it in the generic "Other" fallback group with an auto-humanized name. `bUseAuth` controls whether the dedicated server requires Steam authentication for every joining player; when a real host needs to disable that check (e.g. a split/virtualized Steam session tool), they currently have to know the raw internal field name to find and edit it at all.

---

## Reason

Direct user report: they use "Nucleus co-op" to split one Steam session so two people on the same PC/account setup can play together, which works fine peer-to-peer but fails against an AutoPalExpress-managed dedicated server - Player 2 gets an AUTH error, since the server validates joining players against Steam and Player 2's split session doesn't present a normal Steam identity. They recalled Palworld used to expose a "LAN mode"-style setting for this and asked whether it could be added back.

Confirmed `bUseAuth` is a real, already-present field in Palworld's dedicated server ini schema (`app/services/palworld_settings.py`'s `read_all_settings()` already returns it - it was deliberately left uncurated in TICKET-0061 as "anti-cheat/internal", without confirming what it actually does). Web research confirms `bUseAuth` forces Steam login/validation for joining players and defaults to enabled; setting it to `False` is the documented way server owners disable that check, which matches this exact "split session gets AUTH-blocked" scenario. Not too niche - it's a supported one-line ini toggle, not a new feature to build from scratch.

---

## Implementation Plan

* [x] `app/services/palworld_settings.py`: add a curated `_ADVANCED_META["bUseAuth"]` entry (label, group, help) explaining what it does and naming the LAN/split-session use case, so it shows up as a clearly labeled toggle in World Settings instead of an auto-humanized "Other" field.
* [x] Update `CHANGELOG.md`.
* [x] Verify frontend renders the new curated field correctly (no code change needed - type inference and grouping are already generic/data-driven).

---

## Files Modified

* `app/services/palworld_settings.py`
* `CHANGELOG.md`

---

## Testing

* Direct Python check: built a throwaway `PalWorldSettings.ini` with `bUseAuth=True` in `OptionSettings`, called `read_all_settings()` directly, confirmed the field now returns with `label: "Require Steam Authentication"`, `group: "Identity and Access"`, and the new help text, with `type` correctly inferred as `bool`.
* Direct Python check: called `write_settings(..., {"bUseAuth": False})` against that same fixture ini and confirmed `bUseAuth=False` was written correctly in place - the existing generic write path needed no changes.
* `python -c "import ast; ast.parse(...)"` for a clean syntax check.
* Not tested through a real live browser session (no interactive desktop in this sandbox) - the frontend's World Settings renderer is fully generic/data-driven off this same metadata (confirmed by TICKET-0061's precedent, which added several curated fields the same way with no frontend changes).

---

## Result

World Settings now shows `bUseAuth` as "Require Steam Authentication" under Identity and Access, with help text that explains the trade-off and specifically calls out split/virtualized Steam session co-op tools (like Nucleus) as the reason a host might turn it off. No behavior change to what the setting does - purely a discoverability fix so a host doesn't need to already know Palworld's internal ini field name to find and use it.

---

## Notes

This is a labeling/discoverability fix, not new functionality - `bUseAuth` was already readable/writable through World Settings' generic fallback before this ticket, just unlabeled. Disabling Steam auth is the host's own choice to make; the help text is deliberately explicit that it affects every joining player's identity check, not just the one the host is trying to let in.

---

## Closed

2026-07-16
