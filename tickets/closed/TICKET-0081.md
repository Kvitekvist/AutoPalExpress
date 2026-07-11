# TICKET-0081

**Status**

Closed

**Type**

Bug

**Priority**

Medium

**Created**

2026-07-11

---

## Description

Three problems with the Logs page:

1. Host machine/remote client IP addresses were visible in the "AutoPalExpress" console output panel to any logged-in user, not just the super admin.
2. The same panel was flooded with recurring low-value "ping" entries - actually uvicorn access-log lines for the app's own high-frequency status/log polling (`GET /api/server/status` every 4s, `GET /api/logs/streams` every 5s), drowning out real events.
3. Both Logs page panels appended new entries at the bottom instead of showing the newest entry first.

---

## Reason

User report: IPs shouldn't be exposed to non-super-admins, the log is cluttered with more noise than signal, and new entries should appear at the top instead of requiring a scroll to the bottom.

---

## Implementation Plan

* [x] Traced the IP leak: it's not `activity_log.jsonl` (confirmed no IP ever gets written into an activity-log message) - it's uvicorn's own access log, teed into `backend.log` and shown verbatim as the "AutoPalExpress" panel via `app_log_reader.read_tail()`. Since the app binds `0.0.0.0` and is typically port-forwarded, every request logs the real client IP:port.
* [x] `app/services/app_log_reader.py`: `read_tail()` now takes `mask_ips: bool`, replacing every IPv4 literal in each line with `•.•.•.•` when set.
* [x] `app/routes/logs.py`: `GET /api/logs/streams` now takes the current user (`Depends(get_current_user)`) and masks IPs whenever `user["role"] != "super_admin"`.
* [x] `web/src/pages/Logs.tsx`: added a small hint under the AutoPalExpress panel for non-super-admins explaining IPs are hidden there.
* [x] Traced the "ping" clutter: no code anywhere writes literal "ping" log entries - it's uvicorn access-log noise from `useServerStatus` (mounted globally via `TopBar`, polls `/api/server/status` every 4s) and the Logs page's own auto-refresh (`/api/logs/streams` every 5s, self-referential since the poll shows up in the panel being polled).
* [x] `app/main.py`: added a `logging.Filter` on the `uvicorn.access` logger that drops access-log lines for those two high-frequency polling routes specifically. Requests still succeed normally - only the access-log line is silenced, and only for those two paths, so genuine activity (server start/stop, player actions, mod installs, etc.) still shows.
* [x] Fixed display order: `app_log_reader.read_tail()` now returns newest-first (previously oldest-first/natural file order, so new lines appended at the bottom - `activity_log.get_all()` was already newest-first). `web/src/api/logsApi.ts`'s `exportLogs()` now reverses both arrays back to chronological order for the downloaded text file, since the on-screen order and the natural reading order of an exported log file shouldn't have to match.
* [x] Added the new hint string to all 5 non-English locales.

---

## Files Modified

* `app/services/app_log_reader.py`
* `app/routes/logs.py`
* `app/main.py`
* `web/src/pages/Logs.tsx`
* `web/src/api/logsApi.ts`
* `web/src/i18n/locales/{de,es,fr,ja,zh-Hans}.json`

---

## Testing

* `python -m compileall app` passed clean.
* `npm run build` (tsc + vite) passed clean.
* Verified the IP-masking regex against realistic uvicorn access-log lines (`127.0.0.1:54321 - "GET ... HTTP/1.1" 200`, IPs in `Uvicorn running on http://0.0.0.0:8000`) - all IPv4 literals correctly replaced, ports left intact.
* Verified the polling-noise filter directly: captured `uvicorn.access` log records through the real filter and confirmed `/api/server/status` and `/api/logs/streams` lines are dropped while `/api/server/start` and `/api/players` lines pass through untouched.
* Not done: full browser click-through comparing what a real regular-admin account sees on the Logs page versus the super admin (same sandbox limitation as prior UI-facing tickets) - the masking/filtering logic itself was verified directly against the real functions, not just assumed correct.

---

## Result

The AutoPalExpress console panel on the Logs page no longer exposes real IP addresses to non-super-admin users, no longer fills up with routine status/log polling noise, and both panels now show the newest entry at the top instead of the bottom.

---

## Closed

2026-07-11
