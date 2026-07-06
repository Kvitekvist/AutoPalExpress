# Coding Conventions

This document defines the coding standards for the project.

Claude should follow these conventions unless the user explicitly requests otherwise.

---

# General Principles

* Prioritize readability over cleverness.
* Keep code simple.
* Avoid unnecessary abstractions.
* Minimize duplication.
* Refactor before copying code.
* Remove dead code when encountered.
* Keep the codebase consistent.

---

# Naming Conventions

## Files

Use descriptive names.

Examples:

```
inventory_manager.py
settings_window.cpp
player_controller.cs
```

Avoid:

```
temp.py
test2.cs
newfile.cpp
```

---

## Variables

Use meaningful names.

Good:

```
playerHealth
inventoryItems
connectionTimeout
```

Avoid:

```
a
temp
value1
```

---

## Functions

Function names should describe what they do.

Examples:

```
LoadConfiguration()

CreatePlayer()

SaveProject()

GenerateReport()
```

Avoid generic names such as:

```
DoStuff()

Process()

Run()

Execute()
```

---

## Classes

Use PascalCase.

Examples:

```
InventoryManager

SettingsWindow

DatabaseConnection
```

---

## Constants

Use ALL_CAPS where appropriate.

Example

```
MAX_RETRIES

DEFAULT_TIMEOUT

APP_VERSION
```

---

# Function Design

Functions should:

* Have one responsibility.
* Be reasonably short.
* Return early when possible.
* Avoid deeply nested logic.
* Be easy to test.

---

# Comments

Comment **why**, not **what**.

Good:

```
// Prevent duplicate saves because autosave may still be running.
```

Avoid:

```
// Increment i
i++;
```

---

# Error Handling

* Fail gracefully.
* Log meaningful errors.
* Never silently ignore exceptions.
* Provide useful error messages.

---

# Logging

Log important events only.

Examples:

* Startup
* Shutdown
* Errors
* Warnings
* Important state changes

Avoid excessive debug logging unless requested.

---

# Folder Organization

Keep related files together.

Separate:

* UI
* Business logic
* Data
* Utilities
* Tests

---

# Imports

* Remove unused imports.
* Group standard libraries before third-party libraries.
* Keep imports organized.

---

# Testing

Whenever practical:

* Test new functionality.
* Test bug fixes.
* Verify no regressions.

---

# Refactoring

Refactor when:

* Duplicate logic appears.
* Code becomes difficult to understand.
* Large functions emerge.
* Responsibilities become unclear.

Do not refactor unrelated code during feature development unless it directly improves the requested work.

---

# Documentation

Whenever behavior changes:

Update the relevant documentation.

---

# AI Expectations

Claude should strive to leave the codebase in a cleaner, more maintainable state after every completed task.

---

# Project-Specific Conventions (AutoPalExpress)

The general rules above still apply. These are additional, concrete conventions actually observed/established in this specific codebase - follow these over generic defaults where they conflict.

* **Never use em dashes (—) or en dashes (–)** anywhere - not in code comments, docstrings, UI copy, docs, or commit messages. Use a period, comma, colon, semicolon, or parentheses instead. A plain hyphen (`-`) is fine. This is an explicit, strongly-held user preference.
* **Comments explain why, not what**, and are kept rare - most files in this codebase have zero or very few comments. Only add one for a non-obvious constraint, a workaround for a specific quirk, or a subtlety a future reader would otherwise miss (see real examples throughout `app/services/rcon.py` and `app/services/process_manager.py`).
* **Backend services return plain `dict[str, Any]`/`list[...]`, not custom model classes**, for most internal data (mods, instances, players, automation config). Pydantic models are used for request bodies at the route layer, not as the primary internal data representation.
* **Prefer implementing a small protocol/mechanism directly over adding a dependency** when it's well-understood and modest in size - see the from-scratch UPnP client, RCON client, Windows Firewall UAC elevation, and PBKDF2 password hashing (all stdlib/from-scratch, no new library pulled in for any of them).
* **User-facing copy is consistently dark-fantasy themed** ("the realm," "banished," "inscribed," etc. - see `RuneDialog` confirmations, notification titles, `Sidebar.tsx`). Match this tone in new user-facing strings unless the user asks otherwise.
* **Every route file follows the same `_require_active_instance()` pattern** for routes that act on "the currently active server" - see `app/routes/server_control.py`, `server_settings.py`, `automation.py`, `mods.py`. Reuse this pattern rather than inventing a new one.
* **RCON-unavailable, UPnP-unavailable, and similar "environment isn't configured for this" conditions are modeled as expected, frequent outcomes** (custom exception types like `RconNotConfiguredError`/`RconConnectionError`, caught and turned into clear 400s with actionable messages) - never let these surface as unhandled 500s.
* **Live-test real features against the real, running Palworld server** on the development machine whenever practical (real UAC prompts, real UPnP router, real RCON against a real connected player) rather than only trusting code review - this has repeatedly caught real bugs and protocol quirks that weren't obvious from documentation/spec alone. Avoid destructive live tests against real active state (e.g. never live-test `kick`/`ban` against a real connected player) - use mocked-response tests for those paths instead.
