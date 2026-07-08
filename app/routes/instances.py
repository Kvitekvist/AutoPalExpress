import asyncio
import logging
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth_deps import require_super_admin
from app.services import instance_store, local_config, native_dialog, steam_locator, ue4ss_installer, deploy_jobs

logger = logging.getLogger("palworld_admin.instances")

router = APIRouter()


def _instance_view(instance: dict[str, Any]) -> dict[str, Any]:
    server_path = instance["serverPath"]
    exists = Path(server_path).is_dir()
    executable_found = (Path(server_path) / steam_locator.EXE_NAME).is_file()
    mods_info = local_config.get_mods_path_info(instance)
    mods_path = mods_info["path"]
    ue4ss_status = ue4ss_installer.get_status(instance)
    return {
        **instance,
        "communityServer": bool(instance.get("communityServer")),
        "performanceFlags": bool(instance.get("performanceFlags", True)),
        "workerThreads": instance.get("workerThreads") if instance.get("workerThreads") is not None else None,
        "jsonLogFormat": bool(instance.get("jsonLogFormat")),
        "exists": exists,
        "executableFound": executable_found,
        "modsPath": mods_path,
        "modsPathSource": mods_info["source"],
        "modsPathExists": bool(mods_path and Path(mods_path).is_dir()),
        "ue4ssInstalled": ue4ss_status["installed"],
        "ue4ssVersion": ue4ss_status["installedVersion"],
    }


@router.get("")
async def list_instances() -> dict[str, Any]:
    data = instance_store.list_view()
    return {"activeId": data["activeId"], "instances": [_instance_view(i) for i in data["instances"]]}


@router.get("/active")
async def get_active() -> dict[str, Any] | None:
    instance = instance_store.get_active()
    return _instance_view(instance) if instance else None


class SetActiveRequest(BaseModel):
    id: str


@router.post("/active")
async def set_active(body: SetActiveRequest) -> dict[str, Any]:
    if not instance_store.get(body.id):
        raise HTTPException(status_code=404, detail="No such server instance.")
    instance_store.set_active_instance(body.id)
    data = instance_store.list_view()
    return {"activeId": data["activeId"], "instances": [_instance_view(i) for i in data["instances"]]}


class CommunityServerRequest(BaseModel):
    enabled: bool


class LaunchOptionsRequest(BaseModel):
    performanceFlags: bool
    workerThreads: int | None = None
    jsonLogFormat: bool


@router.post("/{instance_id}/community-server", dependencies=[Depends(require_super_admin)])
async def set_community_server(instance_id: str, body: CommunityServerRequest) -> dict[str, Any]:
    if not instance_store.get(instance_id):
        raise HTTPException(status_code=404, detail="No such server instance.")
    instance_store.update_community_server(instance_id, body.enabled)
    data = instance_store.list_view()
    return {"activeId": data["activeId"], "instances": [_instance_view(i) for i in data["instances"]]}


@router.post("/{instance_id}/launch-options", dependencies=[Depends(require_super_admin)])
async def set_launch_options(instance_id: str, body: LaunchOptionsRequest) -> dict[str, Any]:
    if not instance_store.get(instance_id):
        raise HTTPException(status_code=404, detail="No such server instance.")
    if body.workerThreads is not None and not 1 <= body.workerThreads <= 128:
        raise HTTPException(status_code=400, detail="Worker threads must be between 1 and 128.")
    instance_store.update_launch_options(
        instance_id,
        performance_flags=body.performanceFlags,
        worker_threads=body.workerThreads,
        json_log_format=body.jsonLogFormat,
    )
    data = instance_store.list_view()
    return {"activeId": data["activeId"], "instances": [_instance_view(i) for i in data["instances"]]}


@router.delete("/{instance_id}", dependencies=[Depends(require_super_admin)])
async def remove_instance(instance_id: str) -> dict[str, Any]:
    if not instance_store.get(instance_id):
        raise HTTPException(status_code=404, detail="No such server instance.")
    instance_store.remove_instance(instance_id)
    data = instance_store.list_view()
    return {"activeId": data["activeId"], "instances": [_instance_view(i) for i in data["instances"]]}


class ImportRequest(BaseModel):
    name: str
    path: str


@router.post("/import", dependencies=[Depends(require_super_admin)])
async def import_existing(body: ImportRequest) -> dict[str, Any]:
    path = Path(body.path)
    if not path.is_dir():
        raise HTTPException(status_code=400, detail=f"'{body.path}' is not a folder that exists on this machine.")
    if not (path / steam_locator.EXE_NAME).is_file():
        raise HTTPException(status_code=400, detail=f"No {steam_locator.EXE_NAME} found in '{body.path}'.")
    instance_store.create_instance(name=body.name, server_path=str(path), source="manual")
    data = instance_store.list_view()
    return {"activeId": data["activeId"], "instances": [_instance_view(i) for i in data["instances"]]}


@router.post("/import/detect", dependencies=[Depends(require_super_admin)])
async def import_detected() -> dict[str, Any]:
    found = await asyncio.to_thread(steam_locator.find_install_path)
    if not found:
        raise HTTPException(
            status_code=404, detail="Couldn't find a Palworld Dedicated Server in any Steam library."
        )
    instance_store.create_instance(name="Steam Library Server", server_path=str(found), source="steam")
    data = instance_store.list_view()
    return {"activeId": data["activeId"], "instances": [_instance_view(i) for i in data["instances"]]}


@router.post("/import/browse", dependencies=[Depends(require_super_admin)])
async def browse_import() -> dict[str, Any]:
    path = await asyncio.to_thread(native_dialog.pick_folder, "Select an existing Palworld Dedicated Server folder")
    return {"path": path}


class DeployRequest(BaseModel):
    name: str
    gamePort: int = 8211
    rconPort: int = 8212
    maxPlayers: int = 32
    installParentDir: str | None = None


@router.post("/deploy/browse", dependencies=[Depends(require_super_admin)])
async def browse_deploy_parent() -> dict[str, Any]:
    path = await asyncio.to_thread(
        native_dialog.pick_folder,
        "Select where new Palworld server folders should be created",
    )
    return {"path": path}


@router.post("/deploy", dependencies=[Depends(require_super_admin)])
async def deploy(body: DeployRequest) -> dict[str, Any]:
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Give the server a name.")

    install_parent = None
    if body.installParentDir and body.installParentDir.strip():
        install_parent = Path(body.installParentDir.strip())
        if not install_parent.is_dir():
            raise HTTPException(
                status_code=400,
                detail=f"'{body.installParentDir}' is not a folder that exists on this machine.",
            )

    install_dir = deploy_jobs.install_dir_for(body.name.strip(), install_parent)
    if install_dir.exists() and any(install_dir.iterdir()):
        raise HTTPException(
            status_code=400,
            detail=f"The install folder '{install_dir}' already exists and is not empty. Choose a different name or location.",
        )
    job_id = deploy_jobs.start_deploy(
        name=body.name.strip(),
        install_dir=install_dir,
        game_port=body.gamePort,
        rcon_port=body.rconPort,
        max_players=body.maxPlayers,
    )
    return {"jobId": job_id}


@router.get("/deploy/{job_id}")
async def get_deploy_status(job_id: str) -> dict[str, Any]:
    job = deploy_jobs.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="No such deploy job.")
    return job
