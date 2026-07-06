import asyncio
import logging

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.auth_deps import get_current_user, require_super_admin
from app.paths import resource_dir
from app.routes import automation, auth, instances, mods, network, nexus, players, server_control, server_settings, ue4ss, users
from app.services import first_run_setup, instance_store, scheduler

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

instance_store.migrate_legacy_single_instance()

app = FastAPI(title="Palworld Admin Backend")


@app.on_event("startup")
async def _start_scheduler() -> None:
    asyncio.create_task(scheduler.run_forever())
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
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(nexus.router, prefix="/api/integrations/nexus", tags=["nexus"], dependencies=_authed)
app.include_router(mods.router, prefix="/api/mods", tags=["mods"], dependencies=_authed)
app.include_router(instances.router, prefix="/api/instances", tags=["instances"], dependencies=_authed)
app.include_router(ue4ss.router, prefix="/api/ue4ss", tags=["ue4ss"], dependencies=_authed)
app.include_router(server_control.router, prefix="/api/server", tags=["server"], dependencies=_authed)
app.include_router(server_settings.router, prefix="/api/server-settings", tags=["server-settings"], dependencies=_authed)
app.include_router(automation.router, prefix="/api/automation", tags=["automation"], dependencies=_super_admin_only)
app.include_router(players.router, prefix="/api/players", tags=["players"], dependencies=_authed)
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
