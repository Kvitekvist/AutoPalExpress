# TICKET-0072

**Status**

Open

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

* [ ] Build a shared reveal-toggle control rather than duplicating an eye-icon button six times (per this project's "avoid duplicated logic" rule) - likely a `PasswordInput` wrapper around the existing base `Input` component (`web/src/components/ui/input.tsx`), rendering an `Eye`/`EyeOff` (lucide-react, already a project dependency) button inside the field that flips between `type="password"` and `type="text"`.
* [ ] Swap in `PasswordInput` at all current `type="password"` call sites listed above.
* [ ] For `WorldSettings.tsx`/`LocalApiSettingsPanel.tsx`'s generic `field.sensitive` rendering path, use `PasswordInput` instead of a raw `Input` with `type="password"` whenever `field.sensitive` is true.
* [ ] Decide default state (masked by default, matching current behavior, with the toggle only revealing on demand - not defaulting to visible).
* [ ] Translate the icon button's aria-label ("Show password" / "Hide password") into the 5 non-English locales, consistent with the rest of the i18n work done this session.

---

## Files Modified

* (pending implementation)

---

## Testing

(pending implementation)

---

## Result

(pending)

---

## Notes

Scoped as a shared component specifically so this doesn't turn into six slightly-different one-off implementations - the World Settings/Local API path in particular is a generic field renderer already used for whatever fields happen to be marked `sensitive`, so the fix needs to live there once, not per-field.

---

## Closed

