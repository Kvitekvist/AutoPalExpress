"""Covers the packaged frontend serving in app/main.py: unknown SPA routes
fall back to index.html, real built assets are served, and path traversal is
rejected even bypassing Starlette's own URL normalization (TICKET-0013's
defense-in-depth reasoning - the explicit resolve+containment check must
reject it on its own, not just rely on the framework already stripping ".."
before this handler ever runs).

Skipped entirely if the frontend hasn't been built (`web/dist` doesn't
exist) - `app.main` only registers these routes at all when it does, same
condition the real packaged app relies on. CI builds the frontend before
running backend tests specifically so this isn't skipped there.
"""

import pytest

from app import main as app_main

pytestmark = pytest.mark.skipif(
    not app_main._FRONTEND_DIR.is_dir(),
    reason="frontend not built (web/dist missing) - run `npm run build` in web/ first",
)


def test_unknown_spa_route_serves_index_html(client):
    resp = client.get("/dashboard")
    assert resp.status_code == 200
    assert 'id="root"' in resp.text


def test_real_built_asset_is_served(client):
    asset_files = list((app_main._FRONTEND_DIR / "assets").glob("*.js"))
    assert asset_files, "expected at least one built JS asset"

    resp = client.get(f"/assets/{asset_files[0].name}")
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("application/javascript") or resp.headers["content-type"].startswith(
        "text/javascript"
    )


async def test_spa_fallback_rejects_path_traversal_even_bypassing_url_normalization():
    # A real HTTP request can't reach this handler with ".." still in the
    # path - Starlette's router normalizes it out first. Calling the
    # coroutine directly proves the handler's own explicit containment
    # check would still reject it if that framework behavior ever changed.
    response = await app_main.spa_fallback("../../../../etc/passwd")
    assert response.path == app_main._FRONTEND_DIR / "index.html"


async def test_spa_fallback_rejects_absolute_path_escape():
    response = await app_main.spa_fallback("/etc/passwd")
    assert response.path == app_main._FRONTEND_DIR / "index.html"


async def test_spa_fallback_serves_real_file_when_in_bounds():
    response = await app_main.spa_fallback("favicon.svg")
    assert response.path == app_main._FRONTEND_DIR / "favicon.svg"
