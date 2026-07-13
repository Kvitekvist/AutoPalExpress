# TICKET-0116

**Status**

Closed

**Type**

Feature

**Priority**

Medium

**Created**

2026-07-13

---

## Description

Add a "Run Silently" toggle under Super Admin. When enabled, neither the AutoPalExpress console window nor the Palworld server's own console window is shown. **Disabled by default**, preserving today's behavior (both windows visible, per README's "Logs And Windows" section and the deliberate reversal in TICKET-0019/TICKET-0023).

Two genuinely different mechanisms are involved, since they're two different processes:

* **Palworld's own console window**: `app/services/process_manager.py`'s `start()` launches it with `creationflags=subprocess.CREATE_NEW_PROCESS_GROUP` only (no `CREATE_NO_WINDOW`) - this is exactly the flag TICKET-0019 added and TICKET-0023 removed. Conditionally adding `subprocess.CREATE_NO_WINDOW` when the setting is on is the same, already-proven mechanism; naturally takes effect on the next server start, not live.
* **AutoPalExpress's own console window**: this is the packaged app's own process (PyInstaller spec has `console=True`), already running by the time a super admin could toggle this - there's no "unallocate the console" after the fact from the same process. Needs a live Windows API call instead (`ctypes.windll.kernel32.GetConsoleWindow()` + `ctypes.windll.user32.ShowWindow(hwnd, SW_HIDE/SW_SHOW)`), which real precedent exists for in Windows console apps that support a "hide console" toggle. Whether this can apply live versus needing an app restart is worth confirming during implementation.

Why this is safe to reintroduce now (unlike TICKET-0019, which got reverted): TICKET-0020/TICKET-0023 already built a real Logs page showing AutoPalExpress's own output (`backend.log`, teed from stdout/stderr) and a separate real server activity feed - the thing that made hiding windows a real regression before (losing all visibility into what was happening) no longer applies, since that visibility now lives on the Logs page independent of whether the raw console windows are shown.

---

## Reason

Direct user request - some hosts likely want a cleaner desktop (no floating console windows) once they're not actively debugging, without giving up the underlying app.

---

## Implementation Plan

* [x] `app/services/system_settings.py`: added `runSilently: False` to `_DEFAULTS`; `update_config()` takes a new `run_silently` param.
* [x] `app/services/process_manager.py`'s `start()`: conditionally ORs in `subprocess.CREATE_NO_WINDOW` alongside `CREATE_NEW_PROCESS_GROUP`. Reads the setting via a new `_run_silently_enabled()` that goes straight to `app.storage` rather than importing `system_settings` - `system_settings.py` already imports `process_manager` (for `restore_active_server_if_enabled`), so the reverse import would have been circular.
* [x] `desktop_app.py`: new `_apply_run_silently()`, called once at the top of `main()` right after `_tee_console_streams()` - applies once at AutoPalExpress's own startup (not live), via `GetConsoleWindow()`/`ShowWindow(hwnd, SW_HIDE)`, consistent with the Palworld-side flag also only applying on next start. Confirmed hiding the window doesn't affect the already-teed stdout/stderr handles, so `backend.log`/the Logs page are unaffected.
* [x] New dedicated `web/src/components/settings/RunSilentlyPanel.tsx` on Super Admin, with its own toggle + Save button (same self-contained pattern as `SystemStartupPanel.tsx`, reusing the same `/api/system-settings` GET/POST contract).
* [x] `README.md`'s "Logs And Windows" section now describes visible windows as the default, with a tip pointing at the new Super Admin toggle; added a line to the top feature list too.

---

## Files Modified

* `app/services/system_settings.py`
* `app/routes/system_settings.py`
* `app/services/process_manager.py`
* `desktop_app.py`
* `web/src/components/settings/RunSilentlyPanel.tsx` (new)
* `web/src/pages/SuperAdmin.tsx`
* `web/src/types/models.ts`
* `README.md`

---

## Testing

* `python -m py_compile` on all changed backend files - passes.
* `npx tsc --noEmit` on the frontend - passes with no errors.
* Verified the whole backend app (`app.main`) still imports cleanly (`from app.main import app`) - confirms no circular import between `process_manager` and `system_settings` despite both now referencing the same setting.
* Not tested: an actual restart with the toggle on to confirm both windows really stay hidden (no interactive desktop in this environment, and this app is Windows-only console/WinAPI behavior that can't be meaningfully simulated here).

---

## Result

Super Admin now has a "Run Silently" toggle, off by default. When enabled, both AutoPalExpress's own console window and Palworld's server console window stay hidden from the next start onward; the Logs page is unaffected either way.

**REVERTED (2026-07-13, TICKET-0120)**: after three follow-on bug tickets (TICKET-0117 minimized-not-hidden, TICKET-0118 `_MEIPASS2` crash, TICKET-0119's install-time exe-variant rework), the user asked to roll the entire feature back rather than keep debugging it ("it messes up things, roll back"). See TICKET-0120 for the revert itself.

---

## Notes

Ticket created per explicit user request; implementation deliberately not started yet. The AutoPalExpress-own-console mechanism (live WinAPI show/hide vs. restart-to-apply) is the one open design question worth a quick decision at implementation time.

Retrospective: this feature never actually reached a stable, verified-working state across three real attempts (TICKET-0117/0118/0119) before being reverted - each fix uncovered a new Windows/PyInstaller-specific problem. Worth remembering if "run silently"/headless mode is requested again: the TICKET-0119 approach (two separate PyInstaller builds, console visibility fixed at build time, installer asks at install/update time) was the technically correct direction and got as far as passing a real executable-level test, but was still rolled back before a full end-to-end install/upgrade cycle was verified on the user's actual machine.

---

## Closed

2026-07-13