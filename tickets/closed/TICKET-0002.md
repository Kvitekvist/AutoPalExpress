# TICKET-0002

**Status**

Closed

**Type**

Bug

**Priority**

Medium

**Created**

2026-07-06

---

## Description

`palworld_settings._get_field()` / `_set_field()` could not see or modify a key if it happened to be the *first* field inside `OptionSettings=(...)`. Affects every caller: `read_public_port`, `read_max_players`, `read_rcon_config`, `write_settings`, `initialize_settings`, and the new `enforce_game_port` from TICKET-0001.

## Reason

Both helpers locate a key with a regex lookbehind requiring a `,` or `(` immediately before it - `(?<=[,(])KEY=...`. But they operate on `match.group(1)`, the OptionSettings body with the *opening paren already stripped*, so the first field in the body has nothing but the start of the string before it and the lookbehind can never match there. `_set_field`'s "field not found, append it" fallback also unconditionally prepended a comma, which would produce a leading `,` if used to add a field to an empty body.

This never surfaced on a real Palworld ini because the game's own default template always writes `Difficulty` first. It was caught while building TICKET-0002's self-heal path (`enforce_game_port` writing `PublicPort` into a body that starts out empty), where it failed immediately and reliably.

## Implementation Plan

* [x] Change both regexes' lookbehind to `(?:^|(?<=[,(]))` so start-of-string counts as a valid boundary alongside a preceding `,`/`(`.
* [x] Fix `_set_field`'s append branch to return `f"{key}={value}"` directly for an empty body, instead of `",{key}={value}"`.

## Files Modified

* `app/services/palworld_settings.py` - `_get_field()`, `_set_field()`.

## Testing

* Reproduced the failure directly: a hand-built ini with `PublicPort` as the first (and only preceding) field returned `None` from `read_public_port()` before the fix, correct value after.
* Verified the empty-body append case no longer produces a leading comma.
* Re-ran the full real-ini round-trip test from TICKET-0001 (write `Difficulty`, `PublicPort`, `ServerPlayerMaxNum` against a real ~100-field file) to confirm the fix didn't change behavior for the common (non-first-field) case.

## Result

Every field in `OptionSettings=(...)` is now readable/writable regardless of its position in the file, including the first one.

## Notes

Found incidentally while implementing TICKET-0001; not user-reported on its own, but a real correctness bug in shared, heavily-used parsing code.

## Closed

2026-07-06
