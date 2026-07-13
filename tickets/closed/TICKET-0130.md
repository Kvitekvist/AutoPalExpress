# TICKET-0130

**Status**

Closed

**Type**

Enhancement

**Priority**

High

**Created**

2026-07-13

---

## Description

TICKET-0129's legacy-data migration is fully automatic and silent (a one-time notice appears only *after* it already moved everything). User wants this to ask first: detect old data from a previous install, then let the user explicitly choose between migrating it into the new `Documents\AutoPalExpress\data` location, or leaving it alone and starting with a brand new, empty setup.

---

## Reason

Direct user request: "some users will be updating from a previous install. please run a detection where you search for the old files and give the users the options to migrate to the my documents folder or to start a brand new server." Silent automatic migration doesn't give an upgrading user a chance to decide - some may specifically want a clean start rather than carrying old servers/accounts/mods forward.

---

## Implementation Plan

* [x] `app/paths.py`: split the old `migrate_legacy_data_if_needed()` into two pure/explicit pieces - `detect_legacy_data_dir() -> Path | None` (checks TICKET-0123's install-folder location, then the original pre-0123 AppData location, same priority as before, but only *detects*, never moves anything) and `migrate_data_dir(legacy_dir: Path) -> Path` (performs the actual `shutil.move()` into the Documents location, returns the new path). Added `documents_data_dir() -> Path` - the same path `data_dir()` resolves to, but without the `mkdir` side effect.
* [x] `desktop_app.py`: replaced the automatic `_migrate_legacy_data()` with `_offer_legacy_data_migration()` - if `documents_data_dir()` already exists, nothing to do. Otherwise, if `detect_legacy_data_dir()` finds something, a real Yes/No native dialog (`_ask_yes_no`, extending the existing `_show_message_box` pattern) asks whether to migrate; "Yes" moves the data and shows the existing "moved successfully" notice, "No" leaves the old folder completely untouched and creates a fresh empty Documents data folder immediately (so the question isn't asked again next launch).
* [x] Verified with `py_compile` and direct testing of the new pure functions.

---

## Files Modified

* `app/paths.py`
* `desktop_app.py`

---

## Testing

* `python -m py_compile app/paths.py desktop_app.py` - passes.
* Direct Python-level tests of `detect_legacy_data_dir()`/`migrate_data_dir()`, and the "don't ask twice" behavior (mocking `_documents_dir()` and `sys.frozen`/`sys.executable`, same approach as TICKET-0123/0129's migration tests) - both the "migrate" and "start fresh" paths verified correct.
* Full rebuild via `scripts\build.bat` succeeded.
* A live interactive click-through of the real Yes/No dialog (attempted via `SendKeys` automation against the real compiled exe) was not completed - this sandboxed environment has known limits driving interactive native dialogs (same limitation noted for the Inno Setup wizard GUI in earlier tickets, e.g. TICKET-0018/0062), and the attempt was abandoned in favor of the thorough unit-level verification above, which directly covers the actual decision logic. Test artifacts created during the attempt (a scratch install folder, and a real `Documents\AutoPalExpress` test folder) were found and removed immediately.

---

## Result

Upgrading users now get an explicit choice - via a real Yes/No dialog - between carrying their existing data forward into the new Documents location, or starting completely fresh, instead of silent automatic migration.

---

## Notes

No destructive behavior on "start fresh" - the old data is left exactly where it was, never deleted, in case the user changes their mind later.

---

## Closed

2026-07-13
