# TICKET-0145

**Status**

Closed

**Type**

Enhancement

**Priority**

Medium

**Created**

2026-07-14

---

## Description

Manual mod installation (both "Install From File" and Nexus direct-install downloads) only accepted `.zip` archives, but Nexus commonly hosts Palworld mods as `.7z` too. Added `.7z` support alongside `.zip`. Full `.rar` support is tracked separately as TICKET-0147 (open) since it needs a bundled unrar binary/DLL rather than a pure-Python library, which is a bigger packaging/licensing decision than fits in this batch.

---

## Reason

Direct user feedback (mod-installation report, 2026-07-14): "Manual mod installation via the app only allows .zip files, but Nexus commonly uses other types like .rar."

---

## Implementation Plan

* [x] Added `py7zr` to `requirements.txt` (pure Python, no external binary dependency, unlike `.rar`).
* [x] `app/services/mod_installer.py`: added `is_supported_archive()` (zip or 7z), and made `_archive_names`/`_safe_extract_archive` dispatch to the right format so `detect_mod_kind`, `peek_archive_name`, and `extract_and_install` all work transparently for either format. `.7z` extraction gets the same zip-slip/zip-bomb safety checks `.zip` already had.
* [x] `app/routes/mods.py`: Nexus download validation, install-from-file upload validation, and all `BadZipFile` exception handlers now also accept/catch `.7z` (`py7zr.exceptions.ArchiveError`). Fixed a related bug while here: the downloaded Nexus file name used to have `.zip` force-appended unconditionally, which would have mislabeled a real `.7z` download (harmless to extraction, which checks file contents, but a misleading stored filename) - now only defaults to `.zip` when the real name had no extension at all.
* [x] `web/src/components/mods/InstallFromFileDialog.tsx`: file picker now accepts `.7z` too, with updated help text.

---

## Files Modified

* `requirements.txt`
* `app/services/mod_installer.py`
* `app/routes/mods.py`
* `web/src/components/mods/InstallFromFileDialog.tsx`

---

## Testing

* Confirmed `py7zr` installs cleanly with prebuilt Windows wheels in both project virtualenvs (`.venv` and `.venv312`, the latter being what `build_installer.ps1` actually uses) - no native compilation needed.
* Direct Python test: built a real `.7z` archive containing a UE4SS-style Lua mod folder, confirmed `is_supported_archive`, `detect_mod_kind`, and `extract_and_install` all handle it correctly end-to-end.
* Full PyInstaller rebuild - initially caught a real packaging gap (`py7zr` wasn't installed in `.venv312`, the environment `build_installer.ps1` actually prefers, so the first rebuild's warn-file showed `missing module named py7zr`), fixed by installing it there too, then rebuilt clean with no py7zr-related missing-module warnings. Smoke-tested the actual packaged `AutoPalExpress.exe` launches and serves correctly.
* `npx tsc --noEmit` and `npm run build` pass.

---

## Result

Both Install From File and Nexus direct-install now accept `.7z` archives in addition to `.zip`.

---

## Closed

2026-07-14
