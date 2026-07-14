# TICKET-0148

**Status**

Open

**Type**

Bug

**Priority**

High

**Created**

2026-07-14

---

## Description

User reported being unable to import an existing world save via Save Import, with no specific error message or repro steps given.

---

## Reason

Part of the same user mod-installation feedback as TICKET-0142 through TICKET-0146: "The user was unable to import an existing world save (a separate bug, possibly related to the Save Import feature)."

---

## Implementation Plan (blocked - needs more info)

* [ ] Get the exact error message/behavior from the user: does `inspect_source` reject the folder outright ("not a Palworld world save folder"), does the import itself fail after confirming, or does the app just not detect a save at the path they picked?
* [ ] Reviewed `app/services/save_import_service.py` directly while investigating the rest of the mod feedback - didn't find an obvious code-level bug in the current logic (`_is_world_save_folder` checks for `Level.sav`; `_clear_and_copy` replaces the whole `SaveGames/0` slot with the picked world folder, which looks correct for a dedicated server that only ever has one active world under slot `0`). Without the actual error or a reproducible save folder, further changes here would be guessing.
* [ ] Once reproducible: check whether the failure is folder-picker related (TICKET-0131/0134 already fixed two different Browse-button bugs that could plausibly have affected this same dialog) versus a genuine save-detection/copy logic bug.

---

## Files Modified

None yet - needs more information from the user before proceeding.

---

## Testing

Not started - blocked on reproduction details.

---

## Notes

Investigated `save_import_service.py` as part of the broader TICKET-0142/0146 mod-feedback batch; no confirmed root cause found without a repro. Left open rather than guessing at a fix.
