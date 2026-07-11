# TICKET-0082

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

Some mod archives (reported with "Infinite Weight In Camp") package the mod's full relative install path from the Palworld server folder inside the zip - `Pal/Binaries/Win64/Mods/<ModName>/...` - instead of just the mod's own folder. That's a valid "drop this into your game folder" zip layout for a manual install, but `mod_installer.extract_and_install()` only ever unwraps one lone top-level folder, so it treated `Pal` itself as the mod's folder name and copied the whole `Pal/Binaries/Win64/Mods/...` tree into a Mods folder that's already `.../Win64/Mods`, producing a doubled, non-functional path (`...\Win64\Mods\Pal\Binaries\Win64\Mods\<ModName>\...`).

---

## Reason

User ticket: installed the "infinite weight in camp" mod, it landed at `...\Win64\Mods\Pal\Binaries\Win64\Mods` instead of `...\Win64\Mods`, and didn't work in-game.

---

## Implementation Plan

* [x] `app/services/mod_installer.py`: added `_GAME_PATH_PREFIX_SEGMENTS = ("pal", "binaries", "win64", "mods")` and `_detect_game_path_prefix()`, which checks (case-insensitively) whether an archive's entries all share that exact 4-level wrapper prefix, entry by entry, bailing out to `""` the moment any level doesn't match - so it only fires for this specific known shape, not any archive with nested folders.
* [x] `extract_and_install()` now strips that detected prefix from the extracted temp directory before applying the existing "single top-level folder becomes the mod's folder" rule, so `Pal/Binaries/Win64/Mods/InfiniteWeightInCamp/...` correctly resolves to installing `InfiniteWeightInCamp` directly into the real Mods folder.
* [x] `peek_archive_name()` (used for the pre-install confirmation name) applies the same prefix detection directly against the zip's entry names, so the name shown before installing already matches what actually gets created.
* [x] Verified directly against three archive shapes: the reported nested-prefix bug, a normal single-wrapper-folder mod, and a flat mod with no wrapper folder at all (uses the existing fallback-name path) - confirmed no regression for the two pre-existing cases.

---

## Files Modified

* `app/services/mod_installer.py`

---

## Testing

* `python -m compileall app/services/mod_installer.py` passed.
* Built three synthetic zip archives matching the reported shape, a normal mod, and a flat/no-wrapper mod, and ran `peek_archive_name`/`extract_and_install` against each directly:
  * Nested-prefix archive (the reported bug): installed to `Mods/InfiniteWeightInCamp/...`, confirmed no `Mods/Pal/...` path was created.
  * Normal single-folder archive: installed to `Mods/CoolMod/...`, unchanged from before.
  * Flat archive with no wrapper folder: installed to `Mods/<fallback name>/...`, unchanged from before.
* Not done: reinstalling the actual reported mod through a live browser session (same sandbox limitation as other UI-facing tickets) - the fix was verified directly against the real extraction function with archive shapes matching what was reported, not just assumed correct.

---

## Result

Mod archives that bundle the full `Pal/Binaries/Win64/Mods/<ModName>/...` relative path now install correctly to `Mods/<ModName>/...` instead of creating a broken doubled path. Existing installs already broken by this bug (like the reported one) are not automatically repaired - affected users should remove the mod and reinstall the same archive through the app to get the corrected layout.

---

## Closed

2026-07-11
