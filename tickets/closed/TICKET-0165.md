# TICKET-0165

**Status**

Closed

**Type**

Bug

**Priority**

High

**Created**

2026-07-17

---

## Description

CI's first-ever real run (triggered by the 1.0.8 release push, commit `37483c4`) failed both `backend-tests` matrix jobs (Python 3.11 and 3.12) with:

```
ImportError while loading conftest '.../tests/conftest.py'.
tests\conftest.py:22: in <module>
    from app.services import login_throttle, process_manager, session_store
E   ModuleNotFoundError: No module named 'app'
##[error]Process completed with exit code 4.
```

Root cause: `.github/workflows/ci.yml`'s "Run backend tests" step runs `pytest -v` as the bare console-script entry point. Unlike `python -m pytest` (which prepends the current working directory to `sys.path` automatically, standard Python `-m` behavior), the bare `pytest` command relies entirely on pytest's own rootdir-insertion rule: it climbs up from `conftest.py`'s directory only as far as the topmost directory that still contains an `__init__.py`. `tests/` has no `__init__.py`, so `tests/` itself - not the repo root - is what gets prepended to `sys.path`, and `app/` (the repo root package) is never importable.

This has been latent since TICKET-0154 added the CI workflow and TICKET-0156 extended it - it never surfaced because every verification pass in this project's history (every ticket's "Testing" section) ran the suite locally via `python -m pytest`, which masks the exact bug CI's bare `pytest -v` hits. This was CI's first real trigger on a push to `main` since the workflow file was added, so nothing had exposed it until now.

---

## Reason

Live CI failure reported by the developer immediately after the 1.0.8 release push.

---

## Implementation Plan

* [x] Reproduce locally with the exact bare console-script invocation (`.venv/Scripts/pytest.exe -v`, not `python -m pytest`) - confirmed the same `ModuleNotFoundError`.
* [x] Add `pythonpath = .` to `pytest.ini` - pytest's own built-in ini option (no new dependency), adds the repo root to `sys.path` regardless of how pytest is invoked, so this isn't dependent on remembering to always type `python -m`.
* [x] Re-ran the exact bare invocation to confirm the fix (128 passed).

---

## Files Modified

`pytest.ini`

---

## Testing

`.venv/Scripts/pytest.exe -v` (bare console script, matching CI's exact invocation) now passes all 128 tests, where it previously failed identically to the CI logs. `python -m pytest` (the invocation used throughout this project's history) continues to pass, unaffected by the change.

---

## Result

CI's backend-tests jobs should now pass on the next push. Recommends the developer either push this fix directly or let it ride along with the next batch of commits, since `origin/main`'s CI is currently red on the 1.0.8 release commit.

---

## Notes

Worth remembering for this project going forward: local verification with `python -m pytest` is not equivalent to how CI actually invokes the suite (`pytest -v`) - the two can silently diverge on `sys.path` behavior. `pythonpath = .` in `pytest.ini` closes that gap permanently rather than relying on consistent invocation style.

---

## Closed

2026-07-17
