# TICKET-0083

**Status**

Closed

**Type**

Feature

**Priority**

Medium

**Created**

2026-07-11

---

## Description

Let the super admin pick which file to install when a Nexus mod has more than one downloadable file (e.g. a "Main File" plus one or more "Optional Files"), instead of the app silently choosing one on its own.

---

## Reason

User request: "we need to have a way to pick files if a mod has multiple files", followed up with a concrete example (a real Nexus mod with 2 files) after testing and finding Direct Install gave no way to choose.

Researched the current Direct Install flow first: `app/services/nexus_client.py`'s `get_mod_files()` already fetches a mod's full file list via Nexus's REST `files.json` endpoint (file id, name, version, category, size, uploaded timestamp - everything needed for a picker). But `app/routes/mods.py`'s `_select_installable_nexus_file()` (used by both `install_from_nexus` and `update_mod`) always auto-picks one file itself - the newest file tagged "Main" (category_id 1 / category name containing "main"), falling back to the newest non-old-version file, falling back to the newest file overall. Optional Files were completely invisible in the UI; there was no error or indication more than one file existed, the admin just got whatever was auto-selected with no visibility into the alternative.

The manual "Install From File" upload path is unaffected - the admin already picks the exact archive off their own disk there, so there's no ambiguity to resolve.

---

## Implementation Plan

* [x] `app/routes/mods.py`: split the old `_select_installable_nexus_file()` into `_installable_nexus_files()` (returns every current/non-old-version file, Main file(s) first then newest-first - same candidate set the old auto-pick logic used, just not collapsed to one) and a leaner `_select_installable_nexus_file(files_payload, file_id=None)` that returns the top of that list by default (unchanged auto-pick behavior for single-file mods) or a specific file by id when one is passed.
* [x] New `GET /api/mods/from-nexus/{nexus_mod_id}/files` route (super-admin-gated, matching Direct Install's own gating) returning the simplified file list (fileId, name, version, category, isMain, sizeKb, description) for display.
* [x] `install_from_nexus`/`update_mod` both now accept an optional `file_id` query param, defaulting to the existing auto-pick when omitted, so existing single-file mods keep installing/updating in one click exactly as before.
* [x] `_install_nexus_mod()` threads the optional `file_id` through to `_select_installable_nexus_file()`.
* [x] Frontend: new `NexusFilePickerDialog.tsx` (follows `InstallFromFileDialog.tsx`'s dialog pattern) - lists each file's name/category/version/size, Main file marked with a crown icon, click-to-select, confirm installs with that exact `file_id`.
* [x] `NexusModBrowser.tsx`'s `handleInstall()` now fetches the file list first; if there's more than one file it opens the picker instead of installing immediately, if there's exactly one it installs directly (skipping the picker, matching the old one-click experience for the common case).
* [x] Added `NexusModFile` type and `getNexusModFiles()`/`installFromNexus(nexusModId, fileId?)`/`updateMod(id, fileId?)` to the API layer.
* [x] Added `mods.filePicker.*` translations to all 5 non-English locales.
* [x] `update_mod` also accepts the optional `file_id` for symmetry (not yet wired to a picker UI on the Mods page's own Update button - still auto-picks by default there), so a future ticket can reuse the same picker for updates without further backend work.

---

## Files Modified

* `app/routes/mods.py`
* `web/src/api/modsApi.ts`
* `web/src/types/models.ts`
* `web/src/components/mods/NexusFilePickerDialog.tsx` (new)
* `web/src/components/mods/NexusModBrowser.tsx`
* `web/src/i18n/locales/{de,es,fr,ja,zh-Hans}.json`

---

## Testing

* `python -m compileall app` passed clean.
* `npm run build` (tsc + vite) passed clean.
* Verified the backend selection/listing logic directly against a synthetic Nexus files payload shaped like a real Main + Optional Files mod: `_installable_nexus_files()` correctly orders Main first then newest, excludes old-version files (falling back to the full list only if every file is old), `_select_installable_nexus_file()` picks the same default as before when no `file_id` is given, correctly returns the exact file when a `file_id` is given, and raises a clean 404 for an unknown `file_id`. Also confirmed a single-file mod's list has exactly one entry (so the picker correctly gets skipped for the common case).
* Not committed to git or built into an installer yet per the user's standing "don't commit, I want to test" instruction from earlier in this session.
* Not done: full browser click-through against the real Nexus mod the user linked (nexusmods.com/palworld/mods/577) - same sandbox limitation as other UI-facing tickets. Logic verified directly against the real functions with a realistic payload shape, not just assumed correct.

---

## Result

Direct Install now shows a file picker whenever a Nexus mod has more than one current file, letting the super admin choose exactly which one to install instead of getting whatever the app silently picked. Mods with only one file are unaffected and still install in a single click.

---

## Closed

2026-07-11
