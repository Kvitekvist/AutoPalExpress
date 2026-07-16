from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.auth_deps import get_current_user
from app.services import university

router = APIRouter()


@router.get("")
async def catalog(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return university.get_catalog(user)


@router.post("/{course_id}/activate")
async def activate(course_id: str, user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    try:
        return university.activate(user, course_id)
    except university.UniversityError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{course_id}/steps/{step_id}/complete")
async def complete(course_id: str, step_id: str, user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    try:
        return university.complete_step(user, course_id, step_id)
    except university.UniversityError as e:
        raise HTTPException(status_code=400, detail=str(e))
