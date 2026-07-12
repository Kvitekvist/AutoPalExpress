# TICKET-0093

**Status**

Closed

**Type**

Bug

**Priority**

High

---

## Description

User-reported bug right after a fresh install: the installer asked for a first server name and deployed it, but the app's top bar instance switcher said no servers existed. Trying to create a new server with the same name correctly failed with "install folder already exists" (so no duplicate was actually created), yet the switcher still showed no servers - until a manual browser refresh, after which the real server correctly appeared. The user's underlying worry: someone less inclined to refresh would likely give up and deploy a second server under a different, non-preferred name instead.

---

## Root Cause

`desktop_app.py`'s `open_browser_when_ready()` opens the browser as soon as uvicorn's port is listening, which is essentially immediately on process start. It does not wait for `app/main.py`'s startup-event background task (`first_run_setup.apply_seed_if_present()`) to finish creating the admin account and deploying the seeded first server - that deploy can take minutes (SteamCMD download) and is fired with `asyncio.create_task(...)`, not awaited before serving requests.

Separately, `web/src/components/layout/TopBar.tsx`'s `InstanceSwitcher` fetches `/api/instances` exactly once on mount (`useEffect(..., [])`) with no polling and no refetch trigger. If the browser loads before the seeded deploy finishes, the switcher permanently shows "no servers" for that page load even after the deploy completes moments later in the background - only a manual reload remounts the component and refetches. The reported "already exists" error is real and expected (`app/routes/instances.py`'s `/deploy` route correctly detects the seeded install's non-empty folder); the frontend simply never learned the first deploy had already succeeded.

---

## Implementation Plan

* [x] Made `InstanceSwitcher` poll `/api/instances` every 3 seconds while it has not yet found any instance, stopping automatically once at least one appears - mirrors the existing `useServerStatus` polling pattern instead of introducing indefinite background polling once a normal (server-present) state is reached.
* [x] Updated changelog, project memory, and ticket memory. Architecture unchanged (this is a bug fix to an existing frontend hook, not a new architectural pattern).
* [x] Verified the frontend build and the `/api/instances` response shape the fix relies on.

---

## Files Modified

* `web/src/components/layout/TopBar.tsx`

---

## Testing

* `npm run build` (tsc + vite) passed with the polling change in place.
* Confirmed `GET /api/instances` (via `TestClient`) returns the `{instances, activeId}` shape the switcher already consumed - unchanged by this fix, so the polling loop reads it the same way the original single fetch did.
* Full interactive browser click-through (actually watching the switcher self-heal after a delayed deploy in a real browser) was not performed - this sandbox has no interactive desktop/browser session, the same documented limitation as TICKET-0018/0062/0066. The fix is a direct, narrowly-scoped correction of the exact one-shot-fetch root cause identified from reading the seed/deploy/race code paths together.

---

## Result

The top bar's server switcher no longer gets stuck showing "no servers" when the browser opens before the installer's seeded first-server deploy finishes. It polls every 3 seconds until an instance appears, then stops, so a fresh install no longer requires a manual page refresh to see the server the installer just set up.

---

## Closed

2026-07-12

