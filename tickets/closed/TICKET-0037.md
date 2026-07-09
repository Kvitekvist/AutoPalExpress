# TICKET-0037

**Status**

Closed

**Type**

Feature

**Priority**

High

**Created**

2026-07-09

---

## Description

Add a way for AutoPalExpress to start with Windows, including an installer option. Make the app explain that this is useful because it can bring the managed server back after the machine restarts.

---

## Reason

Hosts may run the server on a home machine that restarts after updates or outages. If AutoPalExpress starts with Windows and restarts the active server automatically, downtime is reduced without requiring the host to manually open the app.

---

## Implementation Plan

* [x] Add backend startup settings and Windows startup shortcut management.

* [x] Add backend launch-time recovery for the active server.

* [x] Add a Settings UI panel for the super admin.

* [x] Add an installer checkbox for launching AutoPalExpress at Windows sign-in.

* [x] Update docs, memory, changelog, and verification notes.

---

## Files Modified

* `app/services/system_settings.py`
* `app/routes/system_settings.py`
* `app/main.py`
* `web/src/components/settings/SystemStartupPanel.tsx`
* `web/src/api/systemSettingsApi.ts`
* `web/src/api/index.ts`
* `web/src/pages/Settings.tsx`
* `web/src/types/models.ts`
* `installer.iss`
* `README.md`
* `NEXUS_DESCRIPTION.md`
* `CHANGELOG.md`
* `.claude/memory/project_memory.md`
* `.claude/memory/architecture.md`
* `.claude/memory/decisions.md`
* `.claude/memory/ticket_memory.md`

---

## Testing

* Passed `npm.cmd run build`.
* Passed `py -3.12 -m compileall app\main.py app\routes\system_settings.py app\services\system_settings.py`.
* Passed Inno Setup compile of `installer.iss`.

---

## Result

AutoPalExpress now has a Settings panel for Windows startup recovery. The super admin can start the app with Windows and choose whether the active server should be started when AutoPalExpress launches. The installer includes an optional startup recovery task that creates the current-user Windows startup entry and seeds the app recovery setting.

---

## Notes

The startup entry is per Windows user via HKCU Run, matching the per-user installer. Recovery skips safely if no active server exists or the selected server is already running.

---

## Closed

2026-07-09
