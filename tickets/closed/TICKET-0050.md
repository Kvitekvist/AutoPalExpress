# TICKET-0050

**Status**

Closed

**Type**

Bug

**Priority**

High

**Created**

2026-07-10

---

## Description

Preserve all existing `PalWorldSettings.ini` values when enforcing the remembered Super Admin game port.

---

## Reason

App reinstall/update preserves the server folder and data, but the launch-time port enforcement path could rebuild from `DefaultPalWorldSettings.ini` if the stored game port and live `PublicPort` disagreed. That protected the port, but risked resetting unrelated world settings back to Palworld defaults in that drift case.

---

## Implementation Plan

* [x] Make game-port enforcement edit the live ini when it exists.
* [x] Keep the template fallback only for brand-new or missing ini files.
* [x] Verify unrelated settings survive port enforcement.
* [x] Update docs/memory and commit.

---

## Files Modified

* `app/services/palworld_settings.py`
* `CHANGELOG.md`
* `.claude/memory/project_memory.md`
* `.claude/memory/ticket_memory.md`

---

## Testing

* Passed: `.venv312\Scripts\python.exe -m py_compile app\services\palworld_settings.py`
* Passed: focused validation that enforcing a remembered port changes `PublicPort` while preserving custom `ServerDescription`, `ExpRate`, and `RESTAPIPort`.

---

## Result

Port enforcement now edits the live ini when one exists, so app reinstall/update and later server starts preserve unrelated world settings.
