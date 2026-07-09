import asyncio
import logging
import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth_deps import require_super_admin
from app.services import deploy_jobs, instance_store, local_config, native_dialog, process_manager, steam_locator, ue4ss_installer

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
        "usePerfThreads": bool(instance.get("usePerfThreads", instance.get("performanceFlags", True))),
        "noAsyncLoadingThread": bool(instance.get("noAsyncLoadingThread", instance.get("performanceFlags", True))),
        "useMultithreadForDs": bool(instance.get("useMultithreadForDs", instance.get("performanceFlags", True))),
        "usePublicIpOverride": bool(instance.get("usePublicIpOverride")),
        "usePublicPortOverride": bool(instance.get("usePublicPortOverride")),
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
    usePerfThreads: bool
    noAsyncLoadingThread: bool
    useMultithreadForDs: bool
    publicLobby: bool
    usePublicIpOverride: bool
    usePublicPortOverride: bool


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
    instance_store.update_launch_options(
        instance_id,
        use_perf_threads=body.usePerfThreads,
        no_async_loading_thread=body.noAsyncLoadingThread,
        use_multithread_for_ds=body.useMultithreadForDs,
        public_lobby=body.publicLobby,
        use_public_ip_override=body.usePublicIpOverride,
        use_public_port_override=body.usePublicPortOverride,
    )
    data = instance_store.list_view()
    return {"activeId": data["activeId"], "instances": [_instance_view(i) for i in data["instances"]]}


@router.delete("/{instance_id}", dependencies=[Depends(require_super_admin)])
async def remove_instance(instance_id: str, deleteFiles: bool = False) -> dict[str, Any]:
    instance = instance_store.get(instance_id)
    if not instance:
        raise HTTPException(status_code=404, detail="No such server instance.")
    if deleteFiles:
        status = process_manager.get_status(instance_id)
        if status["state"] != "offline":
            raise HTTPException(status_code=400, detail="Stop this server before deleting its files.")
        server_path = Path(instance["serverPath"])
        if server_path.exists() and not server_path.is_dir():
            raise HTTPException(status_code=400, detail=f"'{instance['serverPath']}' is not a server folder.")
    try:
        instance_store.remove_instance(instance_id, delete_server_files=deleteFiles)
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Could not delete server files: {e}")
    data = instance_store.list_view()
    return {"activeId": data["activeId"], "instances": [_instance_view(i) for i in data["instances"]]}


@router.post("/{instance_id}/open", dependencies=[Depends(require_super_admin)])
async def open_instance_folder(instance_id: str) -> dict[str, Any]:
    instance = instance_store.get(instance_id)
    if not instance:
        raise HTTPException(status_code=404, detail="No such server instance.")
    server_path = Path(instance["serverPath"])
    if not server_path.is_dir():
        raise HTTPException(status_code=400, detail=f"'{instance['serverPath']}' is not a folder that exists on this machine.")
    try:
        os.startfile(str(server_path))  # type: ignore[attr-defined]
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Could not open the server folder: {e}")
    return {"opened": True}


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
