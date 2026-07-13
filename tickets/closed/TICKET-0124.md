# TICKET-0124

**Status**

Closed

**Type**

Enhancement

**Priority**

Medium

**Created**

2026-07-13

---

## Description

Super Admin's Diagnostics panel has one "Run Diagnostics" button. It already tries to elevate (UAC prompt) first and silently falls back to a non-elevated ("limited") run - with a note in the report - if the user declines or elevation otherwise fails (TICKET-0076). Add a second, explicit "Run Diagnostics as Admin" button that requires the elevated path to succeed: if elevation fails or is declined, it reports a clear error instead of silently degrading to a limited report.

---

## Reason

Direct user request, made mid-conversation while TICKET-0123 was in progress: "also, run diagnostics, add one more button to say 'run diagnostics as admin'". Gives the super admin an explicit way to insist on a full (firewall-inspecting) report and be told plainly if that didn't happen, instead of only ever getting the best-effort/silently-degraded behavior.

---

## Implementation Plan

* [x] `app/services/diagnostics.py`: `run()` takes a new `force_admin: bool = False` parameter. When `force_admin` is True and `_run_elevated()` returns False, raises `DiagnosticsError` instead of falling back to `_run_limited()`.
* [x] `app/routes/system_settings.py`: `/diagnostics` accepts an optional JSON body (`RunDiagnosticsRequest { forceAdmin: bool = False }`, defaulted via a default model instance so an empty POST body still works) and passes it through to `diagnostics.run()`.
* [x] `web/src/api/systemSettingsApi.ts`: `runDiagnostics(forceAdmin = false)` sends `{ forceAdmin }`.
* [x] `web/src/components/settings/DiagnosticsPanel.tsx`: added a second button, "Run Diagnostics as Admin" (`ShieldCheck` icon, `ghost` variant to stay secondary to the existing gold button), calling the same handler with `forceAdmin: true`; the existing "Run Diagnostics" button's behavior is unchanged.
* [x] Verified with `py_compile`/`tsc --noEmit`.

---

## Files Modified

* `app/services/diagnostics.py`
* `app/routes/system_settings.py`
* `web/src/api/systemSettingsApi.ts`
* `web/src/components/settings/DiagnosticsPanel.tsx`

---

## Testing

* `python -m py_compile app/services/diagnostics.py app/routes/system_settings.py` - passes.
* `npx tsc --noEmit` - passes with no errors.
* Included in the same full rebuild as TICKET-0123 (`scripts\build.bat`) - compiled cleanly end to end.

---

## Result

Super Admin's Diagnostics panel now has two buttons: the original "Run Diagnostics" (best-effort, silently falls back to a limited non-elevated report if UAC is declined) and a new "Run Diagnostics as Admin" that requires the elevated path to succeed, surfacing a clear error instead of a silently-degraded report if it doesn't.

---

## Notes

Bundled with TICKET-0123 in the same release build.

---

## Closed

2026-07-13
