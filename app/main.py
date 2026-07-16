import asyncio
import logging
import mimetypes

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.auth_deps import get_current_user, require_super_admin
from app.paths import resource_dir
from app.routes import (
    app_update,
    auth,
    automation,
    instances,
    logs,
    mods,
    network,
    nexus,
    players,
    server_control,
    server_settings,
    system_settings,
    ue4ss,
    users,
)
from app.services import first_run_setup, instance_store, scheduler
from app.services import system_settings as system_settings_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

# Windows can inherit a registry mapping that reports JavaScript as
# text/plain. Browsers refuse to execute ES modules served with that MIME type,
# leaving the packaged app's background visible but never mounting the UI.
# Register both module extensions before StaticFiles/FileResponse are created.
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/javascript", ".mjs")

# Frontend polls these routes every few seconds just to keep status/logs live
# (useServerStatus, the Logs page's own auto-refresh) - every hit landing in
# uvicorn's access log drowns out real activity in the AutoPalExpress console
# panel, so they're filtered out of that log specifically. Actual requests
# still succeed as normal; this only silences the access-log line for them.
_QUIET_POLL_PATHS = ("/api/server/status", "/api/logs/streams")


class _PollingNoiseFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        message = record.getMessage()
        return not any(f" {path} HTTP/" in message for path in _QUIET_POLL_PATHS)


logging.getLogger("uvicorn.access").addFilter(_PollingNoiseFilter())

instance_store.migrate_legacy_single_instance()

app = FastAPI(title="Palworld Admin Backend")


@app.on_event("startup")
async def _start_scheduler() -> None:
    asyncio.create_task(scheduler.run_forever())
    asyncio.create_task(asyncio.to_thread(system_settings_service.restore_active_server_if_enabled))
    # Runs in the background rather than being awaited here - a fresh
    # install's seeded server deploy can take minutes (SteamCMD), and the
    # rest of the app (including the installer's own progress page, which
    # tails first_run_setup's log file) shouldn't be blocked waiting on it.
    asyncio.create_task(first_run_setup.apply_seed_if_present())


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_authed = [Depends(get_current_user)]
_super_admin_only = [Depends(require_super_admin)]

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(app_update.router, prefix="/api/app-update", tags=["app-update"], dependencies=_authed)
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(nexus.router, prefix="/api/integrations/nexus", tags=["nexus"], dependencies=_authed)
app.include_router(mods.router, prefix="/api/mods", tags=["mods"], dependencies=_authed)
app.include_router(instances.router, prefix="/api/instances", tags=["instances"], dependencies=_authed)
app.include_router(ue4ss.router, prefix="/api/ue4ss", tags=["ue4ss"], dependencies=_authed)
app.include_router(server_control.router, prefix="/api/server", tags=["server"], dependencies=_authed)
app.include_router(
    server_settings.router, prefix="/api/server-settings", tags=["server-settings"], dependencies=_authed
)
app.include_router(
    system_settings.router, prefix="/api/system-settings", tags=["system-settings"], dependencies=_super_admin_only
)
app.include_router(automation.router, prefix="/api/automation", tags=["automation"], dependencies=_super_admin_only)
app.include_router(players.router, prefix="/api/players", tags=["players"], dependencies=_authed)
app.include_router(logs.router, prefix="/api/logs", tags=["logs"], dependencies=_authed)
# Port forwarding and firewall changes affect the host machine's network
# exposure - reserved for the super admin, same as account management.
app.include_router(network.router, prefix="/api/network", tags=["network"], dependencies=_super_admin_only)


@app.get("/api/health")
def health() -> dict[str, bool]:
    return {"ok": True}


# In dev, the frontend is served separately by `npm run dev` on :5173 (which
# proxies /api here) and no build output exists, so none of this activates.
# In the packaged app, this same FastAPI process serves the built frontend
# too, so the whole app is a single process on a single port.
_FRONTEND_DIR = resource_dir() / "web" / "dist"
if _FRONTEND_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=_FRONTEND_DIR / "assets"), name="frontend-assets")

    _resolved_frontend_dir = _FRONTEND_DIR.resolve()

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str) -> FileResponse:
        # ASGI/Starlette happens to normalize ".." out of the URL path before
        # this ever runs, but that's an incidental behavior of the framework,
        # not a guarantee this function makes itself - resolve and check
        # containment explicitly (same pattern as mod_installer._safe_extract)
        # rather than relying on that silently continuing to be true.
        candidate = (_FRONTEND_DIR / full_path).resolve()
        in_bounds = candidate == _resolved_frontend_dir or _resolved_frontend_dir in candidate.parents
        if full_path and in_bounds and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(_FRONTEND_DIR / "index.html")
