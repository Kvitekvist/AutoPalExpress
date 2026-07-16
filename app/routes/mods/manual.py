from typing import Any

from fastapi import APIRouter, Depends, File, UploadFile
from pydantic import BaseModel

from app.auth_deps import require_super_admin
from app.routes.mods._shared import require_active_instance
from app.services import manual_mod_service

router = APIRouter()


@router.post("/install-from-file/prepare", dependencies=[Depends(require_super_admin)])
async def prepare_install_from_file(file: UploadFile = File(...)) -> dict[str, Any]:
    """Step 1 of installing an already-downloaded mod file: saves the upload,
    computes its MD5, and checks that hash against Nexus's own fileHash
    lookup. This is a real cryptographic check, not a claim - an empty
    result means these exact bytes have never been published as a Palworld
    mod on Nexus, and the upload is rejected outright. Super-admin-only:
    a matched hash proves the file is a byte-identical copy of something
    Nexus really hosts, which is the whole point, but the *decision* to
    place external files into the live Mods folder still shouldn't be
    something any invited admin can do unilaterally."""
    require_active_instance()
    return await manual_mod_service.prepare_upload(file)


class ConfirmFileInstallRequest(BaseModel):
    token: str


@router.post("/install-from-file/confirm", dependencies=[Depends(require_super_admin)])
async def confirm_install_from_file(body: ConfirmFileInstallRequest) -> list[dict[str, Any]]:
    instance = require_active_instance()
    return await manual_mod_service.confirm_upload(instance, body.token)


@router.delete("/install-from-file/{token}", dependencies=[Depends(require_super_admin)])
async def cancel_install_from_file(token: str) -> dict[str, bool]:
    manual_mod_service.cancel_upload(token)
    return {"ok": True}
