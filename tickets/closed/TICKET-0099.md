# TICKET-0099

**Status**

Closed

**Type**

Bug / Enhancement

**Priority**

Medium

**Created**

2026-07-12

---

## Description

Two follow-ups after TICKET-0098: the user reported seeing nothing in "my wiki on github," and `git push` had started failing outright (403, not just hanging on a Credential Manager prompt like earlier in the session).

---

## Root Cause

Two separate problems, both real:

1. **Stale git credentials.** Git Credential Manager's cached login for `github.com` no longer had push access (`remote: Permission ... denied to Kvitekvist`, HTTP 403), even though the `gh` CLI was still validly authenticated with `push: true` on the repo (confirmed via `gh api repos/Kvitekvist/AutoPalExpress`). This is why TICKET-0098's commit never actually reached `origin/main` despite appearing to complete locally.
2. **Wrong target entirely.** TICKET-0098 added a `wiki/` folder inside the main repository - browsable in the normal file tree, but not the same thing as GitHub's actual Wiki feature, which is a separate git repository (`AutoPalExpress.wiki.git`) only visible under the repo's "Wiki" tab. The user meant the latter.

---

## Implementation Plan

* [x] Ran `gh auth setup-git` to point git's credential handling at the already-working `gh` CLI login instead of the stale Credential Manager entry - fixes future `git push`/`fetch` without needing an interactive sign-in popup.
* [x] Pushed TICKET-0098's pending commit to `origin/main` (now succeeded).
* [x] Confirmed the repo already had Wikis enabled (`has_wiki: true`) and an existing `Home.md`/`Getting-Started-With-AutoPalExpress.md` already live there (created directly on GitHub previously, not through this repo) - read both before adding anything, so nothing existing was overwritten.
* [x] Cloned `AutoPalExpress.wiki.git`, added one page per sidebar item (`Dashboard.md`, `Mods.md`, `Server-Control.md`, `World-Settings.md`, `Logs.md`, `Mod-Wishlist.md`, `Launcher-Options.md`, `Settings.md`, `Super-Admin.md`), matching the existing wiki's own convention of wiki-local `images/<name>.png` screenshot paths (same pattern the pre-existing Getting Started page already used) rather than pointing at the main repo's `images/wiki/` folder.
* [x] Updated `Home.md` with a navigation index (kept the existing welcome line) linking every page, grouped the same way as the sidebar (common pages vs. Host Controls).
* [x] Committed and pushed to the wiki repo.
* [x] Kept the main-repo `wiki/` folder from TICKET-0098 as-is - this project already tolerates parallel docs adapted per audience/venue (e.g. `GETTING_STARTED.md` vs. the wiki's own Getting Started page), so a versioned in-repo copy alongside the live wiki is consistent with that precedent, not redundant clutter.

---

## Files Modified

* Git config (via `gh auth setup-git`, not a tracked file)
* `AutoPalExpress.wiki.git`: `Home.md`, `Dashboard.md`, `Mods.md`, `Server-Control.md`, `World-Settings.md`, `Logs.md`, `Mod-Wishlist.md`, `Launcher-Options.md`, `Settings.md`, `Super-Admin.md` (separate repo, not part of this repo's tree)

---

## Testing

* `git push origin main` succeeded after `gh auth setup-git` (previously failed with 403).
* `git push` to the wiki repo succeeded; verified via the push output showing `master -> master`.

---

## Result

`git push` works again without a stale-credential 403. The actual GitHub Wiki tab now has one page per sidebar item, alongside the pre-existing Home/Getting Started pages, each with a screenshot placeholder ready for the user to fill in directly on the wiki.

---

## Closed

2026-07-12
