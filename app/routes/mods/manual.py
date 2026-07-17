from typing import Any

from fastapi import APIRouter, Depends, File, UploadFile
from pydantic import BaseModel

from app.auth_deps import require_super_admin
from app.routes.mods._shared import require_active_instance
from app.services import manual_mod_service

router = APIRouter()


@router.post("/install-from-file/prepare", dependencies=[Depends(require_super_admin)])
async def prepare_install_from_file(file: UploadFile = File(...)) -> dict[str, Any]:
    """Step 1 of installing a mod file: saves the upload, computes its MD5,
    and checks that hash against Nexus's own fileHash lookup. A match fills
    in real name/author/version metadata for display; no match doesn't block
    the install, it's just shown as unverified - the file itself is still
    validated as a real, safely-extractable archive either way.
    Super-admin-only: the *decision* to place an external file into the live
    Mods folder shouldn't be something any invited admin can do
    unilaterally, matched or not."""
    require_active_instance()
    return await manual_mod_service.prepare_upload(file)


class ConfirmFileInstallRequest(BaseModel):
    token: str
    modName: str | None = None


@router.post("/install-from-file/confirm", dependencies=[Depends(require_super_admin)])
async def confirm_install_from_file(body: ConfirmFileInstallRequest) -> list[dict[str, Any]]:
    instance = require_active_instance()
    return await manual_mod_service.confirm_upload(instance, body.token, body.modName)


@router.delete("/install-from-file/{token}", dependencies=[Depends(require_super_admin)])
async def cancel_install_from_file(token: str) -> dict[str, bool]:
    manual_mod_service.cancel_upload(token)
    return {"ok": True}
