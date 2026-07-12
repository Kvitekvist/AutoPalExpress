# TICKET-0092

**Status**

Closed

**Type**

Bug

**Priority**

High

**Created**

2026-07-12

---

## Description

Fix GitHub issue [#154](https://github.com/Kvitekvist/AutoPalExpress/issues/154): on some Windows 10 systems, the packaged app opens `http://127.0.0.1:8000` and renders the background, but the login/setup UI never appears because bundled JavaScript modules are served as `text/plain`.

Browsers enforce strict MIME checking for module scripts and refuse to execute the frontend bundle unless it is served as JavaScript.

---

## Root Cause

Python's `mimetypes` database can inherit a Windows registry mapping that identifies `.js` as `text/plain`. Starlette `StaticFiles` and `FileResponse` use that database when choosing `Content-Type`, so this host-level mapping breaks the packaged frontend even though the same source works through Vite in development.

---

## Implementation Plan

* [x] Explicitly registered `.js` and `.mjs` as `application/javascript` before mounting packaged frontend static files.
* [x] Kept development-mode behavior unchanged; Vite remains the frontend server there.
* [x] Added a regression check proving both MIME guesses and an actual `/assets/*.js` response use `application/javascript`.
* [x] Updated changelog, project memory, architecture, and ticket memory.
* [x] Compiled and tested the fix.

---

## Reported By

GitHub user `icealive` in issue #154, including the browser console error and a locally verified fix.

---

## Files Modified

* `app/main.py`
* `CHANGELOG.md`
* Project memory and ticket records

---

## Testing

* `python -m py_compile app/main.py` passed.
* `mimetypes.guess_type()` returned `application/javascript` for both `.js` and `.mjs`.
* A FastAPI test request fetched a real built asset from `/assets/` and received `Content-Type: application/javascript`.
* The TestClient emitted an existing Starlette/httpx deprecation warning unrelated to MIME handling.

---

## Result

Packaged AutoPalExpress no longer depends on the host Windows MIME registry for JavaScript. Browsers can execute the frontend module and render the login/setup UI on affected Windows 10 systems.

---

## Closed

2026-07-12
