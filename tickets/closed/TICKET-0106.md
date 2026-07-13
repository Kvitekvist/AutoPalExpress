# TICKET-0106

**Status**

Closed

**Type**

Bug

**Priority**

High

**Created**

2026-07-13

---

## Description

Follow-up to TICKET-0105, found by the user immediately after updating their live server: mods still installed/wishlisted successfully even though they have no real Nexus application slug yet and never reconnected through the new SSO flow. Root cause: TICKET-0105 removed the `POST /connect` endpoint (so a *new* personal key could no longer be pasted in), but never invalidated a personal key that was already saved in `nexus.json` from *before* that change shipped. The old pasted key just kept quietly authenticating Direct Install/Wishlist-approve downloads exactly as before - the one thing Nexus's registration process explicitly requires removed.

---

## Reason

Nexus's requirement is "fully remove personal API key usage," not "block pasting new ones while an old one keeps working." Leaving a pre-existing personal key active defeats the entire point of TICKET-0105 and would leave the app non-compliant even after Nexus approves the real application slug, since nothing would ever force existing installs to actually switch to an SSO-obtained key.

---

## Implementation Plan

* [x] `app/services/nexus_session.py`: `save_record()` calls from the new SSO finalize step now tag the record with `"via": "sso"`. `get_record()` self-heals on every read - any `connected: true` record missing that marker (i.e. anything saved by the old pasted-key `/connect` endpoint, which no longer exists) is treated as non-compliant and cleared back to `{"connected": false}` immediately, no separate migration script needed.
* [x] `app/routes/nexus.py`: SSO finalize (`get_sso_status`) now saves the `"via": "sso"` marker.
* [x] Verified directly (not through the HTTP layer): wrote a `nexus.json` shaped exactly like the old manual-paste flow used to produce, confirmed `nexus_session.get_record()` clears it back to `{"connected": false}` on the very next read and persists that; then confirmed a record already carrying `"via": "sso"` survives a read unchanged.
* [x] Rebuilt the packaged executable and installer so this fix (and TICKET-0105 itself) actually reach the user's running install.

---

## Files Modified

* `app/services/nexus_session.py`
* `app/routes/nexus.py`

---

## Testing

* `python -m py_compile` on both changed files - passes.
* Live-verified the self-healing migration logic against a real `nexus.json` file shape (see Implementation Plan) - both the "clears a legacy personal key" and "leaves a real SSO connection alone" cases pass.
* Rebuilt via `scripts\build.bat` - frontend, PyInstaller, and Inno Setup all completed successfully. New installer checksum: `CF2529186E265FBF8E8383B16903EDBCCC8A4670E50FCA3E795D197E055A640C`.

---

## Result

Fixed and rebuilt. `README.md` and `installer_output/CHECKSUMS.txt` now point at the new installer containing this fix. The next time the user updates, their existing (pre-SSO) Nexus connection will automatically clear itself the first time the app reads it - no action needed on their end beyond installing this build. They'll need to reconnect via SSO once Nexus confirms the real application slug to get Direct Install/Wishlist-approve working again.

---

## Notes

Practical consequence for the user: after installing this build, their existing Nexus connection will silently drop back to disconnected the next time the app reads it (e.g. opening Super Admin or the Mods page) - Direct Install and Wishlist-approve-download will stop working until Nexus confirms the real application slug and they reconnect via SSO. Browsing and Install-From-File (manual verified upload) are unaffected. This is the correct, intended behavior, not a regression - the previous behavior was the actual bug.

---

## Closed

2026-07-13