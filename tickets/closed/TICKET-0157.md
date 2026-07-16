# TICKET-0157

**Status**

Completed

**Type**

Feature

**Priority**

High

**Created**

2026-07-16

---

## Description

Create APE University: a role-aware training center with sequential courses, persisted progress, diplomas, and a quest-style tracker.

## Implementation Plan

* [x] Persist per-user course activation, ordered step completion, and graduation.
* [x] Add a University page listing available training and earned diplomas.
* [x] Add an always-available quest tracker for the active course.
* [x] Auto-activate the Super Admin Degree for a new super admin/server and Admin Basics for regular admins.
* [x] Celebrate graduation with a diploma and confetti.

## Testing

Four API tests plus full backend suite, frontend lint, and production build.
