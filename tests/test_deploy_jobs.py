import pytest

from app.services import deploy_jobs
from app.services.steamcmd import SteamCmdError


def test_new_deploy_phases_are_ordered_and_pending():
    phases = deploy_jobs._new_phases()
    assert [phase["id"] for phase in phases] == ["initialize", "steam", "install", "configure", "register"]
    assert {phase["status"] for phase in phases} == {"pending"}


@pytest.mark.asyncio
async def test_deploy_reports_exact_failed_phase(monkeypatch, tmp_path):
    job_id = "deploy-test"
    deploy_jobs._jobs[job_id] = {
        "status": "running", "log": [], "error": None, "instanceId": None, "phases": deploy_jobs._new_phases()
    }

    async def fail_install(_install_dir, on_output=None, on_ready=None):
        assert on_ready is not None
        on_ready()
        raise SteamCmdError("download failed")

    monkeypatch.setattr(deploy_jobs.steamcmd, "install_palserver", fail_install)
    await deploy_jobs._run_deploy(
        job_id, name="Test", install_dir=tmp_path / "server", game_port=8211, rcon_port=8212, max_players=32
    )

    job = deploy_jobs._jobs[job_id]
    assert job["status"] == "error"
    states = {phase["id"]: phase["status"] for phase in job["phases"]}
    assert states == {"initialize": "done", "steam": "done", "install": "error", "configure": "pending", "register": "pending"}
