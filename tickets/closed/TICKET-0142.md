# TICKET-0142

**Status**

Closed

**Type**

Bug

**Priority**

Critical

**Created**

2026-07-14

---

## Description

UE4SS installs never created a `ue4ss` folder inside `Win64` at all, and mods installed through the app "haven't been functioning" - root cause: the installer downloaded the generic stable `UE4SS-RE/RE-UE4SS` release, which uses an old flat layout (`Win64/UE4SS.dll`, `Win64/Mods/...`). PalSchema and most current-generation Palworld mods require the Palworld-specific experimental fork instead, which nests everything one level deeper (`Win64/ue4ss/UE4SS.dll`, `Win64/ue4ss/Mods/...`) - and PalSchema's own docs explicitly warn that leftover files from the old flat layout make the *old* UE4SS load instead, silently breaking PalSchema and anything depending on it.

---

## Reason

Direct user feedback (mod-installation report, 2026-07-14): "Built-in UE4SS install did not create the expected `ue4ss` folder within Win64," plus a quoted excerpt from PalSchema's own documentation about the "experimental branch" requiring old `Mods` folders to be removed, asking "Is your application directing to the experimental branch and matching this expectation?" Confirmed by directly downloading and inspecting both the old stable release and `Okaetsu/RE-UE4SS`'s `experimental-palworld` release, and by reading PalSchema's real installation docs (`okaetsu.github.io/PalSchema/docs/installation`), which point at that exact fork by name.

---

## Implementation Plan

* [x] `app/services/ue4ss_installer.py`: `GITHUB_REPO` changed from `UE4SS-RE/RE-UE4SS` to `Okaetsu/RE-UE4SS`; asset pattern now matches `UE4SS-Palworld.zip` instead of `UE4SS_v*.zip`.
* [x] Rewrote `_extract_and_merge` as a fully recursive `_merge_dir` so a `Mods` folder is merged per-child (preserving already-installed mods across updates) regardless of how deep the release nests it, instead of only handling one specific top-level shape.
* [x] `_is_installed_on_disk` now checks for `ue4ss/UE4SS.dll` instead of the old flat `UE4SS.dll`.
* [x] `_clean_legacy_flat_install`: removes files this tool's own pre-fix installs could have placed directly in `Win64` (`UE4SS.dll`, `UE4SS-settings.ini`, etc.) before laying down the new nested structure, since PalSchema's docs confirm these actively conflict.
* [x] `_migrate_legacy_flat_mods`: moves any mod folders that had landed in the old flat `Win64/Mods` into the new `Win64/ue4ss/Mods` instead of leaving them stranded, skipping on any name collision rather than overwriting.
* [x] `app/services/local_config.py`: `default_mods_path` now points at `Win64/ue4ss/Mods` (see TICKET-0143).

---

## Files Modified

* `app/services/ue4ss_installer.py`
* `app/services/local_config.py`

---

## Testing

* Downloaded and directly inspected both `UE4SS-RE/RE-UE4SS`'s stable release and `Okaetsu/RE-UE4SS`'s `experimental-palworld` release's real zip contents to confirm the exact layout difference before writing any code.
* Fetched PalSchema's real installation docs to confirm the required fork and folder structure rather than guessing.
* Direct Python test of `_extract_and_merge` against the real downloaded `UE4SS-Palworld.zip` - confirmed `dwmapi.dll`, `ue4ss/UE4SS.dll`, and `ue4ss/Mods/` all land correctly.
* Direct Python test of `_clean_legacy_flat_install` + `_migrate_legacy_flat_mods` against a simulated old flat install with a user's mod folder - confirmed the legacy files are removed, the user's mod is migrated into the new location, and UE4SS's own built-in mods are also present afterward.
* `python -m py_compile`, `npx tsc --noEmit`, `npm run build`, and a full installer rebuild all pass; smoke-tested the actual packaged `AutoPalExpress.exe` starts and serves correctly.

---

## Result

UE4SS installs now use the Palworld-specific fork with the folder layout PalSchema and current-generation mods actually expect, and upgrading from a prior broken install automatically cleans up the old conflicting files and migrates any mods that had landed in the wrong place.

---

## Closed

2026-07-14
