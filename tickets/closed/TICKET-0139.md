# TICKET-0139

**Status**

Closed

**Type**

Enhancement

**Priority**

Low

**Created**

2026-07-14

---

## Description

Show the actual default server deployment location under the "Server Deployment Location" field in Deploy New Server, instead of just the generic label "Default AutoPalExpress servers folder" - so the super admin can see exactly where a new server will land (`Documents\AutoPalExpress\Servers`, TICKET-0133/0136) without needing to already know that convention or deploy one to find out.

---

## Reason

Direct user request: "in server Deployment, it should show a text box under the input that says where the default location is for new servers."

---

## Implementation Plan

* [x] `app/routes/instances.py`: new `GET /instances/deploy/default-location` (super-admin-gated, matching the other deploy/import routes) returning `{"path": str(deploy_jobs.default_servers_dir())}` - the real, resolved path (respects Documents redirection, dev-mode fallback, etc.), not a hardcoded guess.
* [x] `web/src/api/instancesApi.ts`: added `getDefaultDeployLocation()`.
* [x] `web/src/components/settings/DeployServerWizard.tsx`: fetches the real default path when the dialog opens; shows it as a small monospace hint line directly under the location field whenever no custom folder has been chosen (`!installParentDir`) - the exact condition where the input itself is just showing the generic placeholder text.

---

## Files Modified

* `app/routes/instances.py`
* `web/src/api/instancesApi.ts`
* `web/src/components/settings/DeployServerWizard.tsx`

---

## Testing

* `python -m py_compile app/routes/instances.py` - passes.
* `npx tsc --noEmit` - passes.
* `npm run build` - passes.
* Verified `deploy_jobs.default_servers_dir()` (the function the new route calls directly) resolves correctly in dev mode (`data/servers` under the project root); the packaged/frozen resolution to `Documents\AutoPalExpress\Servers` was already verified end-to-end in TICKET-0133/0136.
* Not tested via a real authenticated HTTP round-trip (the route requires a super-admin session) - the route itself is a thin, one-line wrapper around an already-verified function, following the exact same pattern as this file's other working deploy/import routes.

---

## Result

Deploy New Server now shows the real default server folder path directly under the location field, instead of a generic label with no indication of where that actually resolves to.

---

## Closed

2026-07-14
