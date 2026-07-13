# TICKET-0072

**Status**

Closed

**Type**

Feature

**Priority**

Low

**Created**

2026-07-10

---

## Description

Add a "show/hide password" eye icon toggle to password fields throughout the app, instead of them being permanently masked with no way to check what was typed.

Password fields that exist today, all using `<Input type="password">` with no reveal option:

* `web/src/components/auth/LoginScreen.tsx` - login password
* `web/src/components/auth/SetupScreen.tsx` - first super admin account password + confirm password
* `web/src/components/settings/NexusIntegrationPanel.tsx` - Nexus Mods API key
* `web/src/pages/WorldSettings.tsx` and `web/src/components/settings/LocalApiSettingsPanel.tsx` - both render `type="password"` generically whenever a field's `sensitive` flag is set (currently `ServerPassword`/`AdminPassword` in World Settings)

---

## Reason

User request: add an eye icon to reveal password field contents.

---

## Implementation Plan

* [x] Build a shared reveal-toggle control rather than duplicating an eye-icon button six times (per this project's "avoid duplicated logic" rule) - `web/src/components/ui/password-input.tsx`, a `PasswordInput` wrapper around the existing base `Input` component, rendering an `Eye`/`EyeOff` (lucide-react) button inside the field that flips between `type="password"` and `type="text"`.
* [x] Swap in `PasswordInput` at all current `type="password"` call sites: `LoginScreen.tsx`, `SetupScreen.tsx`. (The Nexus Mods API key field this ticket originally listed no longer exists - TICKET-0105 replaced manual key paste with SSO, so there's no password field left in `NexusIntegrationPanel.tsx` to convert.)
* [x] For `WorldSettings.tsx`/`LocalApiSettingsPanel.tsx`'s generic `field.sensitive` rendering path, use `PasswordInput` instead of a raw `Input` with `type="password"` whenever `field.sensitive` is true.
* [x] Default state is masked, matching current behavior - the toggle only reveals on demand.
* [ ] Translate the icon button's aria-label ("Show password" / "Hide password") into the 5 non-English locales - **not done**: confirmed this session that base `components/ui/*` primitives in this codebase are plain Radix wrappers with no i18n of their own anywhere (unlike `components/fantasy/*`/`components/settings/*`, which do call `useTranslation()`); `PasswordInput` follows that existing convention rather than being the first primitive to break it. Screen-reader-only text, not visible UI copy - low-impact if revisited later.

---

## Files Modified

* `web/src/components/ui/password-input.tsx` (new)
* `web/src/components/auth/LoginScreen.tsx`
* `web/src/components/auth/SetupScreen.tsx`
* `web/src/pages/WorldSettings.tsx`
* `web/src/components/settings/LocalApiSettingsPanel.tsx`

---

## Testing

* `npx tsc --noEmit` on the frontend - passes with no errors.

---

## Result

Every password field in the app (login, register, first-run setup account + confirm, and any World Settings/Local API field marked `sensitive`) now has a reveal/hide eye icon, masked by default.

---

## Notes

Scoped as a shared component specifically so this doesn't turn into six slightly-different one-off implementations - the World Settings/Local API path in particular is a generic field renderer already used for whatever fields happen to be marked `sensitive`, so the fix needs to live there once, not per-field.

---

## Closed

2026-07-13