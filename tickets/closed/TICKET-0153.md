# TICKET-0153

**Status**

Closed

**Type**

Enhancement

**Priority**

Medium

**Created**

2026-07-16

---

## Description

In the Mods page's Browse Nexus Mods dialog, super admins previously saw "Direct Install" (uses their saved Nexus Premium key) and an "Install File" shortcut link on every mod card, in addition to wishlist. Regular admins only ever saw "Add to Wishlist" there already. Made browsing wishlist-only for both roles: removed Direct Install and Install File from that dialog for super admins too, so every mod card there now only offers Add to Wishlist / Requested / Installed.

Confirmed out of scope with the user: the separate Super Admin page's own "Install From File" verified-upload panel, and the Mod Wishlist page's Approve action (which installs via the same Nexus Premium key) - both stay as-is. This only changed the Browse Nexus Mods dialog's per-card buttons.

## Reason

User request: both admins and super admin should only be able to wishlist a mod from the Mods category browse dialog, no direct download for either role.

---

## Implementation Plan

* [x] Remove `canInstallFromFile`/`canDirectInstall` gating in `NexusModBrowser.tsx` so every card renders the wishlist button regardless of role
* [x] Simplify `NexusModCard.tsx` to drop the Direct Install / Install File branch (dead props removed)
* [x] Update banner copy in `NexusModBrowser.tsx` (currently tells super admins about Direct Install)
* [x] Update `wiki/mods.md` to stop documenting Direct Install as reachable from Browse Nexus Mods

---

## Files Modified

* `web/src/components/mods/NexusModBrowser.tsx` - removed the Nexus-account fetch, `canDirectInstall`/`canInstallFromFile` gating, `handleInstall`/multi-file-picker flow, and role-split banner text; unified banner copy for every role.
* `web/src/components/mods/NexusModCard.tsx` - dropped the Direct Install / Install File button branch and its props; every non-installed, non-requested card now renders only the wishlist button.
* `web/src/components/mods/NexusFilePickerDialog.tsx` - deleted (only ever used by the removed direct-install multi-file flow).
* `web/src/components/mods/NexusBrowseDialog.tsx` - dropped the now-unused `onModsChanged` prop plumbing and updated the dialog description.
* `web/src/pages/Mods.tsx` - stopped passing `onModsChanged` into `NexusBrowseDialog`.
* `web/src/i18n/locales/{de,es,fr,ja,zh-Hans}.json` - retranslated `mods.nexusBrowse.description` and `mods.nexusBrowser.banner`, removed now-dead `nexusBrowser`/`nexusCard` keys tied to Direct Install/Install File (including a few keys - `superAdminOnly`, `superAdminOnlyTooltip`, `hintViewThenAsk` - that were already dead before this ticket).
* `wiki/mods.md` - updated the install/wishlist section to reflect the single wishlist path.
* `CHANGELOG.md` - added an Unreleased entry.

---

## Testing

`cd web && npm run build` (tsc -b && vite build) passes clean. Verified via grep that no remaining code references the removed props/handlers/translation keys, and that all 5 edited locale JSON files still parse.

Live browser click-through was **not** performed: this app manages the user's real installed Palworld server/account data (real `data/users.json`, real Nexus session), and I don't have credentials for the existing super admin account to log in and verify visually. Consistent with this project's own precedent for sandboxed UI verification (TICKET-0018, TICKET-0062, TICKET-0066 all noted the same limitation for interactive click-through). The user should confirm in a real browser session that both admin and super admin now only see Add to Wishlist in Browse Nexus Mods.

---

## Result

Mod browsing is now wishlist-only for every role. Direct Install and Install File no longer appear anywhere in the Browse Nexus Mods dialog, for admins or the super admin.

---

## Notes

Needs a real manual click-through by the user to fully confirm (see Testing).

---

## Closed

2026-07-16
