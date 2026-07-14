# TICKET-0143

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

Every mod installed through the app - pak-based content mods, UE4SS Lua/Blueprint mods, and PalSchema itself - always landed in the same single `Win64/Mods` folder, regardless of what kind of mod it actually was. Real Palworld modding has (at least) two genuinely different install locations: raw `.pak` content mods are mounted directly by the game from `Pal/Content/Paks/~mods`, while UE4SS-loaded mods (including PalSchema) belong under `Pal/Binaries/Win64/ue4ss/Mods` (TICKET-0142). Installing everything into one folder is why pak mods "haven't been functioning" and why PalSchema ended up in the wrong place even when its target folder was pre-created by hand.

---

## Reason

Direct user feedback (mod-installation report, 2026-07-14): "Installing mods via the manager installs them to Win64\Mods regardless of whether they're pak or schema-type mods, and they haven't been functioning," "Installing PalSchema... creates a PalSchema folder under Win64\Mods, but it's expected under the ue4ss\mods folder instead," and "Pak mods installed via the manager do not go to the expected Pal\Content\Paks\~mods folder - they also end up in Win64\Mods."

---

## Implementation Plan

* [x] `app/services/local_config.py`: added `default_pak_mods_path()`/`get_pak_mods_path()` (`Pal/Content/Paks/~mods`, derived only, no override) alongside the existing UE4SS mods path (now `Win64/ue4ss/Mods`, TICKET-0142).
* [x] `app/services/mod_installer.py`: added `detect_mod_kind()` - classifies an archive as `"pak"` (contains any `.pak` file anywhere) or `"ue4ss"` (everything else, including PalSchema), since real UE4SS mods never ship a `.pak`. Generalized the existing full-game-path-prefix stripping (previously only for `Pal/Binaries/Win64/(ue4ss/)?Mods/`) to also recognize `Pal/Content/Paks/~mods/`, so archives that package their full relative install path work correctly for pak mods too.
* [x] `app/routes/mods.py`: added `_base_path_for_kind()` to pick the right folder for a mod's kind. All four install/reinstall paths (Nexus install, verified-file-upload confirm, and the "install now" branch inside enable) detect the kind from the downloaded archive and route accordingly, recording `installKind` on the mod entry. Enable/disable/remove now read `installKind` (defaulting to `"ue4ss"` for mods installed before this fix) to operate on the correct folder.

---

## Files Modified

* `app/services/local_config.py`
* `app/services/mod_installer.py`
* `app/routes/mods.py`

---

## Testing

* Direct Python test: built a real `.7z`-packed UE4SS-style mod (Lua script in a `Scripts` folder) and a `.zip`-packed pak-style mod (a loose `.pak` file) and confirmed `detect_mod_kind` correctly classified each, and `extract_and_install` placed each into its own destination folder correctly.
* `python -m py_compile`, `npx tsc --noEmit`, `npm run build`, and a full installer rebuild all pass.
* Not tested against a real live Palworld server with real mods actually loading in-game (no interactive desktop/live server in this sandbox) - the folder-routing logic itself is verified directly; whether a specific real-world mod archive's internal layout is detected correctly depends on that mod's own packaging, which can still vary.

---

## Result

Pak mods now install to `Pal/Content/Paks/~mods` and UE4SS/PalSchema mods now install to `Pal/Binaries/Win64/ue4ss/Mods`, instead of everything landing in one folder that matched neither convention.

---

## Closed

2026-07-14
