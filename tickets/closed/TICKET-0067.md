# TICKET-0067

**Status**

Closed

**Type**

Feature

**Priority**

Medium

**Created**

2026-07-10

---

## Description

Follow-up to TICKET-0066: after shipping the TopBar/Sidebar language switcher, the user pointed out World Settings itself (the generic `PalWorldSettings.ini` editor - field labels, help text, descriptions, and dropdown option text) was still English-only. Extend translation to all 99 curated World Settings fields, across all six languages, while guaranteeing the actual config file on disk (and everything sent to the backend) stays in Palworld's own English enum values - only the *display* text is translated.

---

## Reason

The user's exact requirement: "we keep the config on the machine as english so whatever values they pick must be display values, and we still pass on the english values." Confirmed via AskUserQuestion to do full translation effort now (not a partial batch) for all 99 fields across the 5 non-English languages already shipped in TICKET-0066.

---

## Implementation Plan

* [x] `app/services/palworld_settings.py`: added a curated `"label"` to the 22 `_ADVANCED_META` fields that previously fell back to `_humanize_key()` (e.g. `CollectionDropRate` -> "Gathering Drop Rate", `VoiceChatMaxVolumeDistance` -> "Voice Chat Full Volume Distance"), so every one of the 99 fields now has a real English label as the translation fallback baseline.
* [x] `web/src/pages/WorldSettings.tsx`: reworked to look up every displayed string through `react-i18next`'s `t()` with the backend's English text as `defaultValue` - group name (`worldSettings.groups.<Group>`), field label/help/description (`worldSettings.fields.<key>.{label,help,description}`), and dropdown option label/description (`worldSettings.fields.<key>.options.<value>.{label,description}`). The dropdown `value` itself is never translated or looked up - it is passed through unchanged from the backend and back on save, so the exact English enum string (e.g. `Difficulty=Hard`) is what lands in `PalWorldSettings.ini` regardless of UI language. Also translated the page chrome (panel titles, Save/Saving, unsaved-changes counter, Enable/Disable, the synthetic "current value" dropdown entry, and the generic per-type help fallback for uncurated fields).
* [x] Translated all 99 fields (label + help + description where present + dropdown option label/description) plus all 11 group names and ~24 chrome strings into Chinese Simplified, Japanese, German, French, and Spanish - added as a new `worldSettings` key in each of `web/src/i18n/locales/{zh-Hans,ja,de,fr,es}.json`. English needed no new locale file - it already comes from the backend's own text as the `t()` fallback, so a translation gap for any given language/field silently shows correct English instead of a raw key.
* [x] Verified every non-English locale file's `worldSettings.fields` keys, and every dropdown's option values, exactly match the backend's real field/option set (scripted diff against a live extraction of `POPULAR_FIELDS`/`_ADVANCED_META`) - no missing or stray keys in any of the 5 files.

---

## Files Modified

* `app/services/palworld_settings.py` - 22 new curated labels in `_ADVANCED_META`.
* `web/src/pages/WorldSettings.tsx` - full translation-lookup rework (group/label/help/description/options/chrome), English fallback via `defaultValue`.
* `web/src/i18n/locales/{zh-Hans,ja,de,fr,es}.json` - new `worldSettings` section (groups, fields, chrome) in each.
* `CHANGELOG.md`, `.claude/memory/architecture.md`, `.claude/memory/project_memory.md`, `.claude/memory/ticket_memory.md`.

---

## Testing

Manual, against the real running backend/frontend dev servers (restarted cleanly after editing `palworld_settings.py`, since `uvicorn --reload` did not reliably pick up every edit mid-session - confirmed the new `CollectionDropRate` label only appeared after a full process restart, not just the reloader's file-watch trigger):

* `npm run build` (tsc + vite build) passed clean with no type errors.
* Verified via `curl` against a real throwaway test account and the real `Tester1` server instance: `GET /api/server-settings` returns the new curated English labels (e.g. `CollectionDropRate` -> "Gathering Drop Rate"); wrote `Difficulty=Hard` through `POST /api/server-settings`, confirmed the API echoed back `"value": "Hard"`, and confirmed the literal string `Difficulty=Hard` is what's actually on disk in the real `PalWorldSettings.ini` - proving the English-on-disk requirement holds end-to-end, not just in theory. Reverted the test value back to `None` afterward and removed the throwaway account/invite.
* Scripted (Python) key-parity check confirmed all 5 non-English locale files cover every one of the 99 field keys, every dropdown's option values, and all 11 group names with no gaps or extras.
* Not done in this sandbox: visually clicking through World Settings in a real browser to confirm every translated string renders and wraps correctly in each of the 6 languages - same standing limitation as TICKET-0066 (can't drive a real interactive browser window here). The dev servers were left running for the user to check directly.

---

## Result

World Settings now displays fully translated field labels, help text, descriptions, dropdown options, and group headers in all 6 supported languages, while every value written to `PalWorldSettings.ini` remains Palworld's exact English enum/string - verified against the real file on disk, not just the API response.

---

## Notes

Uncurated fields (the ~16-20 fields Palworld ships with no curated metadata at all, shown via `_humanize_key()`) are still English-only in every language, same gap as before this ticket - there's no curated English text to translate for those, and inventing labels for fields nobody uses was out of scope here.

---

## Closed

2026-07-10
