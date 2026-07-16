# TICKET-0154

**Status**

Closed

**Type**

Feature

**Priority**

High

**Created**

2026-07-16

---

## Description

`tests/` was empty and the Python environment had no `pytest`. There was no CI at all - no `.github/workflows`. Added a real, focused backend test suite (auth, permissions, instance switching, backup/restore, save import, archive extraction, process discovery, packaged frontend serving) and wired up CI to run backend tests, frontend lint/build, and a packaging smoke test on every change.

## Reason

User request: this is "the biggest gap" in the project - no automated verification existed beyond manual click-through (which this sandboxed environment repeatedly can't do itself, per many past tickets' NEEDS MANUAL VERIFICATION notes). A real test suite and CI catch regressions without depending on a human re-testing everything by hand every time.

---

## Implementation Plan

* [x] Add an `AUTOPAL_DATA_DIR` env-var override to `app/paths.py.data_dir()` so tests can redirect every store (users, instances, mods, backups) at a temp folder instead of the real `data/` directory, without touching production behavior.
* [x] Add `requirements-dev.txt` (pytest, pytest-asyncio), `requirements-build.txt` (pyinstaller), and `pytest.ini`.
* [x] `tests/conftest.py`: set the env override before any `app.*` import, an autouse per-test fixture that clears the temp data dir, and fixtures (`client`, `super_admin`, `invited_admin`) for login-flow tests.
* [x] `tests/test_auth.py` - first-super-admin creation (and that a second attempt fails), invite issue/redeem/reject-invalid/reject-reused, login success/failure, username/password validation, super-admin removal protection.
* [x] `tests/test_permissions.py` - role-gated routes (`/api/network`, `/api/system-settings`, `/api/automation`, `/api/users`, mods wishlist approve/deny) 403 for a regular admin and pass the gate for the super admin; unauthenticated requests 401.
* [x] `tests/test_instances.py` - create/switch/remove instances, active-id reassignment on removal, path-based dedupe, query-port collision rejection.
* [x] `tests/test_backup_restore.py` - `run_backup`/`backup_before_import` against a fake `SaveGames` folder, same-second backup collision gets a numbered suffix, `list_backups`/`_prune_old_backups`.
* [x] `tests/test_save_import.py` - `inspect_source` valid/invalid save folder detection, `import_save` refuses while the server isn't offline, successful import replaces the save slot and creates a pre-import backup.
* [x] `tests/test_mod_installer.py` - zip-slip rejection, oversized-archive rejection, pak vs ue4ss kind detection, game-path-prefix stripping (`Pal/Binaries/Win64/ue4ss/Mods/...`, `Pal/Content/Paks/~mods/...`), enable/disable/remove round-trip on disk.
* [x] `tests/test_process_discovery.py` - `_process_matches_instance`/path-containment matching logic against mocked `psutil.Process` objects, `start()` failure when `PalServer.exe` is missing, `get_status()` offline state.
* [x] `tests/test_frontend_serving.py` - `spa_fallback` serves `index.html` for unknown SPA routes, serves a real static asset when present, and rejects a path-traversal attempt even bypassing Starlette's own URL normalization (calling the handler directly, per TICKET-0013's defense-in-depth reasoning).
* [x] `.github/workflows/ci.yml` - `backend-tests` (ubuntu-latest, Python 3.11/3.12 matrix), `frontend` (ubuntu-latest, lint+build), `packaging-smoke` (windows-latest: PyInstaller build via the existing `.spec` + launch + `/api/health` check; Inno Setup compile-only check).

---

## Files Modified

* `app/paths.py` - added the `AUTOPAL_DATA_DIR` test-only override in `data_dir()`.
* `requirements-dev.txt` (new) - pytest, pytest-asyncio.
* `requirements-build.txt` (new) - pyinstaller.
* `pytest.ini` (new).
* `tests/conftest.py`, `tests/test_auth.py`, `tests/test_permissions.py`, `tests/test_instances.py`, `tests/test_backup_restore.py`, `tests/test_save_import.py`, `tests/test_mod_installer.py`, `tests/test_process_discovery.py`, `tests/test_frontend_serving.py` (all new).
* `.github/workflows/ci.yml` (new).
* `web/src/components/settings/SaveImportDialog.tsx` - fixed a pre-existing lint error (deprecated octal escape in the placeholder string) found while validating the new `frontend` CI job.
* `README.md` - added a "Run tests" dev docs section.
* `CHANGELOG.md`, `.claude/memory/architecture.md`, `.claude/memory/decisions.md`, `.claude/memory/project_memory.md`, `.claude/memory/ticket_memory.md` - documented the new suite/CI and the `AUTOPAL_DATA_DIR` mechanism.

---

## Testing

76 backend tests pass locally (`.venv` Python 3.11 and `.venv312` Python 3.12, run twice each for repeatability - no cross-test leakage). Confirmed the real `data/` folder was untouched throughout (isolated via `AUTOPAL_DATA_DIR`). `npm run lint` and `npm run build` both pass clean. All three CI jobs' real mechanics were validated locally end-to-end before committing the workflow (GitHub Actions itself can't be dry-run from here): built `AutoPalExpress.exe` with PyInstaller via the real `.spec`, launched it and got a real `{"ok":true}` from `/api/health`, then compiled `installer.iss` with a real `ISCC.exe`.

Not covered by automated tests, matching this project's existing manual-verification pattern for anything needing a real Windows host/live game process/interactive desktop: actual process start/stop launch flags, real UAC/firewall/UPnP calls, native folder dialogs, the installer's own GUI wizard, and whether the actual GitHub Actions runners behave identically to this local validation.

---

## Result

`tests/` now has a real, passing 76-test pytest suite, and every push/PR runs backend tests, frontend lint/build, and a packaging smoke test via GitHub Actions.

---

## Notes

Future tickets adding new backend logic should extend this suite rather than relying on manual verification alone, per the user's stated priority. The `AUTOPAL_DATA_DIR` override is test-only infrastructure - never set it outside `tests/conftest.py`.

---

## Closed

2026-07-16
