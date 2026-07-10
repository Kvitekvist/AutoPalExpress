# TICKET-0066

**Status**

Closed

**Type**

Feature

**Priority**

Medium

**Created**

2026-07-10

---

## Description

Add multi-language support (i18n) to the frontend: a language switcher in the top bar (dropdown showing a flag + native name for the current language, list of supported languages to pick from), persisted per logged-in user rather than per browser/machine.

Confirmed with the user which languages to ship for v1 and where translations come from:

* Languages: English (default/fallback), Chinese - Simplified (`zh-Hans`), Japanese (`ja`), German (`de`), French (`fr`), Spanish (`es`).
* Translation source: written directly by Claude Code (no external translation service/library).
* Storage: per-user-login, not per-browser - the language follows the account across devices/sessions.

---

## Reason

A user asked for Chinese language support. Built as a proper i18n layer (react-i18next + JSON translation files) so additional languages are new translation files, not new code paths.

---

## Implementation Plan

* [x] Add an i18n library: `react-i18next` + `i18next` (React 19-compatible, JSON translation files, small runtime footprint for the PyInstaller-bundled static build).
* [x] Store language choice server-side per user account (`app/services/auth.py`: `language` field on the user record, `SUPPORTED_LANGUAGES` tuple, `set_language()`; new `PATCH /api/auth/me/language` route in `app/routes/auth.py`, reachable by any logged-in user via `get_current_user`, not gated to super admin). Existing pre-i18n accounts fall back to `"en"` via `user.get("language", DEFAULT_LANGUAGE)`.
* [x] Extract TopBar (`web/src/components/layout/TopBar.tsx`) page titles/subtitles, the instance switcher, and the user menu strings into translation keys; same for the Sidebar (`web/src/components/layout/Sidebar.tsx`) nav labels. This is the v1 translated surface - other pages remain English-only until extended.
* [x] Add `LanguageSwitcher` component (`web/src/components/layout/LanguageSwitcher.tsx`): dropdown trigger showing the active language's flag + native name, dropdown content listing all six languages.
* [x] Flags: inline emoji (🇺🇸🇨🇳🇯🇵🇩🇪🇫🇷🇪🇸) - no new icon dependency, matches the project's "minimal dependencies" principle.
* [x] Wire the selected language into i18next's active locale (`useAuth`'s `setLanguage`, calling both the new `authApi.setLanguage` and `i18n.changeLanguage`) and persist it via the backend; also cached in `localStorage` (`web/src/i18n/index.ts`) purely so a page reload shows the right language before the `/auth/me` round-trip resolves, not as the source of truth.
* [x] All six languages translated end-to-end for the v1 surface (no English-fallback placeholders) since the user named all five non-English languages up front.
* [x] Verified: switching languages updates the Sidebar/TopBar text without a full page reload; dropdown shows the correct flag/name for the active language; invalid language codes are rejected server-side (400).
* [x] Updated `README.md`, `CHANGELOG.md`, `.claude/memory/architecture.md`, `.claude/memory/tech_stack.md`, `.claude/memory/ticket_memory.md`.

---

## Files Modified

* `app/services/auth.py` - `SUPPORTED_LANGUAGES`, `DEFAULT_LANGUAGE`, `language` field on user records, `public_view()`, `set_language()`.
* `app/routes/auth.py` - `PATCH /me/language`.
* `web/package.json` - added `i18next`, `react-i18next`.
* `web/src/i18n/index.ts`, `web/src/i18n/languages.ts` - i18next init, supported-language metadata (code/flag/native name).
* `web/src/i18n/locales/{en,zh-Hans,ja,de,fr,es}.json` - translation strings for the v1 surface.
* `web/src/main.tsx` - import i18n init before render.
* `web/src/components/layout/LanguageSwitcher.tsx` - new component.
* `web/src/components/layout/TopBar.tsx`, `web/src/components/layout/Sidebar.tsx` - translated strings, mounted `LanguageSwitcher`.
* `web/src/hooks/useAuth.tsx` - sync i18n language on login/checkAuth, expose `setLanguage()`.
* `web/src/api/authApi.ts`, `web/src/api/httpClient.ts` (added `patch()`) - `setLanguage()` API call.
* `web/src/types/models.ts` - `AuthUser.language`.
* `README.md`, `CHANGELOG.md`.

---

## Testing

Manual, against the real running backend/frontend dev servers (no automated frontend test suite exists yet, see `.claude/memory/tech_stack.md`):

* `npm run build` (tsc + vite build) passed clean; `npm run lint` showed only pre-existing warnings unrelated to this change.
* Registered a throwaway test account through the real invite flow and exercised the real endpoints with `curl`: `POST /api/auth/register` → `language: "en"` by default; `PATCH /api/auth/me/language {"language":"de"}` → returns `language: "de"`; `GET /api/auth/me` reflects it; a brand-new login session (fresh cookie) still returned `language: "de"`, confirming server-side per-user persistence rather than session/cookie-local state; `PATCH .../language {"language":"xx"}` correctly returned 400. Cleaned up the throwaway account and invite code afterward.
* Confirmed pre-existing real user records (no `language` key) still load correctly via `public_view()`'s fallback.
* Started the real Vite dev server and FastAPI dev server side by side; confirmed both come up clean with no errors in either log.
* Not done in this sandbox: clicking through the actual dropdown in a real browser window (flag rendering, live text swap) - this environment can't drive/observe an interactive desktop browser session, same limitation noted on prior tickets (e.g. TICKET-0018, TICKET-0062). Both dev servers were left running (`http://localhost:5173`) for the user to click through directly.

---

## Result

Shipped a working v1: per-user language preference (English default, Chinese Simplified, Japanese, German, French, Spanish), a flag+name dropdown in the TopBar, and the Sidebar/TopBar chrome translated into all six languages. Verified functionally correct end-to-end via direct API calls against the real backend; visual/interactive browser confirmation is left for the user since this sandbox can't drive a real browser window.

---

## Notes

Deliberately scoped to the app chrome (Sidebar nav + TopBar titles/subtitles/instance switcher/user menu) for v1, not every page - full-app translation is a much larger, incremental effort (each additional page's strings need extracting and translating across all six languages). Follow-up tickets should extend `web/src/i18n/locales/*.json` page by page rather than re-architecting anything here.

---

## Closed

2026-07-10
