"""Role-aware, sequential APE University course progress."""

import time
from typing import Any

from app import storage

_STORE = "university_progress"

COURSES: dict[str, dict[str, Any]] = {
    "super_admin": {
        "title": "Authorized AutoPalExpress Super Admin",
        "shortTitle": "Super Admin Degree",
        "roles": ("super_admin",),
        "autoStart": True,
        "steps": (
            ("create_server", "Create or import a server", "Open Server Instances and create or import the realm you will manage.", "/settings"),
            ("set_ports", "Set the server ports", "Review and save the game, query, and Local API ports before exposing anything.", "/super-admin"),
            ("forward_ports", "Forward the ports", "Use UPnP, or configure the router manually and confirm the checkbox when it points to this PC.", "/super-admin"),
            ("firewall", "Allow the firewall rules", "Run the Windows Firewall actions for the panel and game ports.", "/super-admin"),
            ("mods_choice", "Choose whether to use mods", "Decide whether this realm will use UE4SS mods. You can change this later.", "/mods"),
            ("public_choice", "Choose public or private visibility", "Decide whether the server should appear publicly or remain for invited friends.", "/launcher-options"),
            ("check_updates", "Check for server updates", "Check SteamCMD for a newer Palworld Dedicated Server build.", "/control"),
            ("setup_backup", "Set up backups", "Enable a schedule and review retention so the realm has a recovery plan.", "/settings"),
            ("start_server", "Start the server", "Start the configured server. This is the final graduation task.", "/control"),
        ),
    },
    "mod_supervisor": {
        "title": "AutoPalExpress Mod Supervisor",
        "shortTitle": "Mod Supervisor Degree",
        "roles": ("super_admin",),
        "autoStart": False,
        "requires": "super_admin",
        "steps": (
            ("install_ue4ss", "Install UE4SS", "Install the supported UE4SS runtime before adding script mods.", "/mods"),
            ("wishlist_one", "Wishlist your first mod", "Browse Nexus and add one suitable mod to the wishlist.", "/mods"),
            ("wishlist_two", "Wishlist a second mod", "Add a second mod so you can practice reviewing a small change set.", "/mods"),
            ("approve_one", "Approve the first mod", "Review its source and approve it from Mod Wishlist.", "/mod-wishlist"),
            ("approve_two", "Approve the second mod", "Approve the second request and confirm both installs.", "/mod-wishlist"),
            ("reorder", "Change mod order", "Move a mod and understand that order can affect compatibility.", "/mods"),
            ("disable_all", "Disable all mods", "Practice the safest troubleshooting baseline by disabling every mod.", "/mods"),
        ),
    },
    "admin_basics": {
        "title": "AutoPalExpress Server Administrator",
        "shortTitle": "Admin Basics Degree",
        "roles": ("admin", "super_admin"),
        "autoStart": True,
        "steps": (
            ("start_server", "Start the server", "Learn where server start lives and how to recognize the starting state.", "/control"),
            ("stop_server", "Stop the server safely", "Use Stop so Palworld can save and shut down cleanly.", "/control"),
            ("wishlist_mod", "Wishlist a mod", "Browse Nexus and request a mod for the super admin to review.", "/mods"),
            ("kick_training", "Kick the training player", "Use the safe academy simulator below to remove Captain Lamball.", "/university"),
            ("world_settings", "Learn the World Settings rule", "Stop the server before editing World Settings; changes take effect after it starts again.", "/world-settings"),
        ),
    },
}


class UniversityError(Exception):
    pass


def _load() -> dict[str, Any]:
    return storage.load(_STORE, {})


def _save(value: dict[str, Any]) -> None:
    storage.save(_STORE, value)


def _user_progress(user_id: str) -> dict[str, Any]:
    data = _load()
    return data.setdefault(user_id, {"activeCourse": None, "courses": {}})


def _allowed(course: dict[str, Any], role: str) -> bool:
    return role in course["roles"]


def _serialize(course_id: str, progress: dict[str, Any], role: str) -> dict[str, Any]:
    course = COURSES[course_id]
    completed = progress.get("completedSteps", [])
    steps = []
    for index, (step_id, title, description, route) in enumerate(course["steps"]):
        steps.append({"id": step_id, "title": title, "description": description, "route": route,
                      "completed": step_id in completed, "locked": index > len(completed)})
    return {"id": course_id, "title": course["title"], "shortTitle": course["shortTitle"],
            "available": _allowed(course, role), "active": progress.get("active", False),
            "graduatedAt": progress.get("graduatedAt"), "steps": steps,
            "requires": course.get("requires")}


def get_catalog(user: dict[str, Any]) -> dict[str, Any]:
    data = _load()
    user_progress = data.setdefault(user["id"], {"activeCourse": None, "courses": {}})
    courses = user_progress["courses"]
    allowed = [cid for cid, course in COURSES.items() if _allowed(course, user["role"])]
    if not user_progress["activeCourse"]:
        preferred = "super_admin" if user["role"] == "super_admin" else "admin_basics"
        # Auto-start once for a new account/setup, but never silently restart
        # a degree the user has already graduated from.
        if preferred not in courses:
            courses[preferred] = {"active": True, "completedSteps": [], "graduatedAt": None}
            user_progress["activeCourse"] = preferred
            _save(data)
    views = [_serialize(cid, courses.get(cid, {}), user["role"]) for cid in allowed]
    return {"activeCourse": user_progress["activeCourse"], "courses": views}


def activate(user: dict[str, Any], course_id: str) -> dict[str, Any]:
    if course_id not in COURSES or not _allowed(COURSES[course_id], user["role"]):
        raise UniversityError("This course is not available for your role.")
    data = _load()
    progress = data.setdefault(user["id"], {"activeCourse": None, "courses": {}})
    requirement = COURSES[course_id].get("requires")
    if requirement and not progress["courses"].get(requirement, {}).get("graduatedAt"):
        raise UniversityError("Graduate from the prerequisite degree first.")
    for value in progress["courses"].values():
        value["active"] = False
    course_progress = progress["courses"].setdefault(course_id, {"completedSteps": [], "graduatedAt": None})
    course_progress["active"] = True
    progress["activeCourse"] = course_id
    _save(data)
    return get_catalog(user)


def complete_step(user: dict[str, Any], course_id: str, step_id: str) -> dict[str, Any]:
    data = _load()
    progress = data.setdefault(user["id"], {"activeCourse": None, "courses": {}})
    course_progress = progress["courses"].get(course_id)
    if not course_progress or progress["activeCourse"] != course_id:
        raise UniversityError("Activate this course before completing lessons.")
    ids = [step[0] for step in COURSES[course_id]["steps"]]
    completed = course_progress.setdefault("completedSteps", [])
    if step_id not in ids:
        raise UniversityError("No such lesson.")
    index = ids.index(step_id)
    if index > len(completed):
        raise UniversityError("Complete the earlier lessons first.")
    if step_id not in completed:
        completed.append(step_id)
    if len(completed) == len(ids):
        course_progress["graduatedAt"] = time.time()
        course_progress["active"] = False
        progress["activeCourse"] = None
    _save(data)
    return get_catalog(user)
