# TICKET-0084

**Status**

Closed

**Type**

Bug

**Priority**

High

**Created**

2026-07-11

---

## Description

Follow-up to TICKET-0082: the user tested the fix live and still got a doubled, non-functional path - `...\Kraken_1_0\Pal\Binaries\Win64\Mods\Pal\Binaries\Win64\ue4ss\Mods`. TICKET-0082's fix only recognized archives shaped exactly `Pal/Binaries/Win64/Mods/<ModName>/...`; this mod's zip had an extra `ue4ss` segment - `Pal/Binaries/Win64/ue4ss/Mods/<ModName>/...` - which some mod authors include since that's UE4SS's own internal folder naming, even though it lands in the same real Mods folder AutoPalExpress manages (`local_config.py` always uses `Pal/Binaries/Win64/Mods`, no `ue4ss` segment). The stricter 4-segment check in TICKET-0082 correctly declined to touch this 5-segment shape (by design, to stay safe), which meant the old single-top-level-folder fallback took over and mis-installed it exactly like before.

---

## Reason

Live user test of the TICKET-0082 fix immediately surfaced a second archive shape carrying the same underlying problem.

---

## Implementation Plan

* [x] `app/services/mod_installer.py`: generalized `_detect_game_path_prefix()` to match a fixed `Pal/Binaries/Win64/` prefix followed by an *optional* single `ue4ss` segment, then a required `Mods` segment - recognizing both `Pal/Binaries/Win64/Mods/...` and `Pal/Binaries/Win64/ue4ss/Mods/...`. Still bails out to no stripping the instant any level doesn't match, so archives with a genuinely different shape are untouched.
* [x] Factored the repeated "does this prefix have exactly one child, what's its name" check into a small `_sole_top_level_name()` helper, reused by both `_detect_game_path_prefix()` and `peek_archive_name()` (previously duplicated inline).
* [x] Verified directly against both known nested shapes (with and without the `ue4ss` segment) plus the pre-existing normal and flat-archive regression cases.

---

## Files Modified

* `app/services/mod_installer.py`

---

## Testing

* `python -m compileall app/services/mod_installer.py` passed.
* Ran `peek_archive_name`/`extract_and_install` against four synthetic archives: `Pal/Binaries/Win64/ue4ss/Mods/<Mod>/...` (the newly reported shape), `Pal/Binaries/Win64/Mods/<Mod>/...` (TICKET-0082's original shape), a normal single-folder mod, and a flat archive with no wrapper folder. All four installed to the correct `Mods/<ModName>/...` path with no leftover `Mods/Pal/...` tree.
* Not committed to git or built into an installer yet per the user's standing "don't commit, I want to test" instruction from earlier in this session.

---

## Result

Mods packaged with either the plain or the `ue4ss`-segmented full relative game path now install correctly. Anyone who already has a broken doubled-path install from either shape needs to remove it and reinstall the same archive.

---

## Closed

2026-07-11
