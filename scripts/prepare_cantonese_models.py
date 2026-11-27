"""Explicit OmniVoice weight download. This process never runs inference."""
import asyncio
from pathlib import Path
import site
import sys
import sysconfig


async def download():
    from api.routers.setup import download as upstream
    from services.omnivoice_checkpoint import installed_omnivoice_checkpoint

    if installed_omnivoice_checkpoint():
        return
    repo = "k2-fsa/OmniVoice"
    await upstream.start_model_install(upstream.InstallModelRequest(repo_id=repo), anonymous=True)
    job = upstream._install_tasks_by_repo[repo]
    while not job.done():
        for state in upstream.model_install_status()["jobs"]:
            total = state.get("total_bytes")
            percent = min(99, int(state.get("bytes_done", 0) * 100 / total)) if total else 0
            print(percent, flush=True)
        await asyncio.wait({job}, timeout=1)
    await job
    if not installed_omnivoice_checkpoint():
        failures = upstream.model_install_status()["jobs"]
        error = failures[0].get("error") if failures else None
        raise SystemExit(error or "OmniVoice download incomplete.")


if __name__ == "__main__":
    # The signed app uses -I -S to skip the inference-only sitecustomize hook.
    if sys.flags.no_site:
        site.addsitedir(sysconfig.get_path("purelib"))
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
    asyncio.run(download())
