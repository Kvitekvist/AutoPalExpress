# TICKET-0013

**Status**

Closed

**Type**

Bug

**Priority**

High

**Created**

2026-07-06

---

## Description

Fresh security audit (follow-up to TICKET-0008/0009/0010/0011), prompted partly by reviewing Crafty Controller (a comparable game-server panel) for inspiration. Finding: `app/main.py`'s SPA fallback route (`spa_fallback`, serves the built frontend for any path not otherwise matched) concatenated a raw, unauthenticated, user-supplied path directly onto its frontend directory and served whatever file resulted, with no explicit containment check of its own.

## Reason

Crafty Controller's equivalent static-file handler (`app/classes/web/static_handler.py`) extends Tornado's `StaticFileHandler`, which has its own built-in, explicit path-containment check (`validate_absolute_path`) - it doesn't hand-roll raw path concatenation. Our `spa_fallback` did exactly the thing Crafty's approach avoids: `_FRONTEND_DIR / full_path` with no resolved-path containment check before calling `.is_file()` / `FileResponse`.

Live HTTP testing showed this **isn't currently exploitable through a normal request** - Starlette/ASGI happens to normalize `..` out of the URL path before the route handler ever sees it (confirmed with several encoding variants: bare `../`, `%2e%2e`, `..%2f`). But that's an incidental behavior of the framework, not a guarantee this function makes itself: calling the function directly with a raw `"../../secret.txt"` string (bypassing whatever the HTTP layer normalizes) proved the underlying path resolution genuinely escapes the frontend directory and would serve any readable file on the host - with **no authentication required at all**, since this route sits outside every router that has auth dependencies. This is exactly the kind of latent risk worth closing before it depends on incidental behavior surviving a future Starlette/FastAPI upgrade, a different reverse-proxy configuration (relevant given the in-progress Nginx Proxy Manager setup), or any other change to how the request path reaches this handler.

## Implementation Plan

* [x] `spa_fallback` now resolves the candidate path and explicitly checks it's within the (also pre-resolved) frontend directory before serving it - same pattern already used correctly elsewhere in this codebase (`mod_installer._safe_extract`'s zip-slip defense).

## Files Modified

* `app/main.py`.

## Testing

Verified directly against the actual route function (not just reasoning about it): a raw `"../../secret.txt"` string, which previously would have resolved outside the frontend directory, now correctly falls back to `index.html` instead of the planted secret file - tested by calling the function directly (bypassing whatever the ASGI layer normalizes) to confirm the function's *own* logic is now safe, not just incidentally protected. Confirmed normal asset serving (e.g. `favicon.svg`) is unaffected. Full PyInstaller + Inno Setup rebuild succeeded.

## Result

The SPA fallback route now has its own explicit path-containment check and no longer depends on incidental framework behavior to stay safe.

## Notes

Direct inspiration from reviewing Crafty Controller's static file handler, at the user's suggestion. See TICKET-0014 for the second finding from this same audit pass (automation routes permission mismatch).

## Closed

2026-07-06
