# TICKET-0160

**Status**

Completed

**Type**

Enhancement

**Priority**

Medium

**Created**

2026-07-16

---

## Description

Replace the opaque Deploying label with a real deployment timeline showing completed, current, failed, and upcoming work.

## Implementation Plan

* [x] Expose explicit deployment phases from the backend job.
* [x] Mark the exact phase that failed while leaving future phases pending.
* [x] Render completed phases green, current phase animated gold, failures red, and future phases grey.
* [x] Keep the existing live SteamCMD log available beneath the timeline.

## Testing

Two focused backend tests, full backend suite, frontend lint, and production build.
