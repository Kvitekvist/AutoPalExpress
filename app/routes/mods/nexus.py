from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.auth_deps import require_super_admin
from app.routes.mods._shared import require_active_instance
from app.services import nexus_client, nexus_mod_service, nexus_session
from app.services.nexus_client import NexusApiError

router = APIRouter()


@router.get("/from-nexus/{nexus_mod_id}/files", dependencies=[Depends(require_super_admin)])
async def get_nexus_mod_files(nexus_mod_id: int) -> list[dict[str, Any]]:
    """Current (non-old-version) files for a Nexus mod, Main file(s) first,
    so the UI can offer a real choice when a mod has more than one - e.g. a
    Main File plus one or more Optional Files."""
    api_key = nexus_session.require_premium_api_key()
    try:
        files_payload = await nexus_client.get_mod_files(api_key, nexus_mod_id)
    except NexusApiError as e:
        raise HTTPException(status_code=e.http_status, detail=e.message)
    files = nexus_mod_service.installable_nexus_files(files_payload)
    return [
        {
            "fileId": int(f["file_id"]),
            "name": f.get("name") or f.get("file_name") or "File",
            "version": f.get("version") or "",
            "category": f.get("category_name") or ("Main" if nexus_mod_service.is_main_file(f) else "Other"),
            "isMain": nexus_mod_service.is_main_file(f),
            "sizeKb": f.get("size_kb"),
            "description": f.get("description") or "",
        }
        for f in files
    ]


@router.post("/from-nexus/{nexus_mod_id}/install", dependencies=[Depends(require_super_admin)])
async def install_from_nexus(nexus_mod_id: int, file_id: int | None = None) -> list[dict[str, Any]]:
    instance = require_active_instance()
    return await nexus_mod_service.install_nexus_mod(instance, nexus_mod_id, file_id)
