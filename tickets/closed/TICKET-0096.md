# TICKET-0096

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

User asked to update the README to catch up with recent work (TICKET-0088 through TICKET-0095), and to validate the local copy against what's actually live on GitHub first, since the user wasn't sure if they'd edited the README directly through the GitHub web UI.

---

## Root Cause / Validation

Fetched `origin` and diffed local `README.md` against `origin/main`'s copy - no differences. `origin/main` (`811cec5`, TICKET-0091) is a strict ancestor of local `main`, so no direct online edit has happened since the last push; the local README is what's actually live on GitHub today.

---

## Implementation Plan

* [x] Confirmed local `README.md` matches `origin/main` exactly (`git diff origin/main -- README.md`) before editing, so no online-only edits were at risk of being overwritten.
* [x] Reviewed TICKET-0088 through TICKET-0095 for anything user-facing/dev-facing missing from the README:
  * TICKET-0090 (donation link) was a real visible feature with no README mention - added a bullet.
  * TICKET-0095 (`scripts/build.bat`) replaces the old `powershell -ExecutionPolicy Bypass` instruction as the recommended way to build the installer - updated the "For Developers" section.
  * TICKET-0088/0089/0091 were already covered by existing README text; TICKET-0092/0093 are internal bug fixes with no user-facing behavior to document; TICKET-0094 only changed where an already-documented feature lives in the UI, not what it does.
* [x] Left the published installer checksum untouched - it correctly reflects the last actual tagged/published release (1.0.5), not the unpublished local 1.0.6 dev build.

---

## Files Modified

* `README.md`

---

## Testing

* Reviewed the rendered Markdown diff by eye; no build step applies to README changes.

---

## Result

README now mentions the sidebar donation link and documents `scripts\build.bat` as the simple way to build the installer, alongside the existing direct PowerShell invocation. Confirmed beforehand that the local README already matched what's live on GitHub, so no online-only edits were lost.

---

## Closed

2026-07-12
