# TICKET-0159

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

Add the Admin Basics Degree: safe practice for start/stop, mod wishlist, player kick, and offline World Settings behavior.

## Implementation Plan

* [x] Explain and sequence the basic admin workflow.
* [x] Provide an isolated fake-player kick exercise that never touches a real player.
* [x] Teach that World Settings should be changed offline and apply after the next start.

## Testing

Regular-admin role availability and course isolation covered by API tests; frontend production build passes.
