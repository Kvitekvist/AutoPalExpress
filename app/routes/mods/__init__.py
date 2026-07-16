"""Mod management routes, split by concern: wishlist CRUD (wishlist.py),
general mod list/enable/disable/reorder (crud.py), Nexus direct-install
(nexus.py), and manual verified-file install (manual.py). Business logic
that isn't HTTP-shaping lives in app/services/nexus_mod_service.py and
app/services/manual_mod_service.py instead of here.

Routes are merged by extending `routes` directly rather than
`include_router()`, since crud.py's list endpoint is registered at path ""
(matching the original single-file router, mounted at /api/mods with no
trailing slash) - `include_router()` rejects merging a sub-router whose path
is "" when neither router has a prefix yet, even though the real prefix
("/api/mods") is added later in app/main.py."""

from fastapi import APIRouter

from app.routes.mods import crud, manual, nexus, wishlist

router = APIRouter()
for _sub_router in (wishlist.router, crud.router, nexus.router, manual.router):
    router.routes.extend(_sub_router.routes)
