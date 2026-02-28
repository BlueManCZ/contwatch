from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.dependencies import CurrentUser, DbSession
from app.models.action import Action
from app.schemas.action import ActionCreate, ActionRead, ActionUpdate
from app.socketio_app import sio

router = APIRouter(prefix="/actions", tags=["actions"])


@router.get("/", response_model=list[ActionRead])
async def list_actions(db: DbSession, _current_user: CurrentUser):
    result = await db.execute(select(Action))
    return result.scalars().all()


@router.get("/{action_id}", response_model=ActionRead)
async def get_action(action_id: int, db: DbSession, _current_user: CurrentUser):
    result = await db.execute(select(Action).where(Action.id == action_id))
    action = result.scalar_one_or_none()
    if not action:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Action not found")
    return action


@router.post("/", response_model=ActionRead, status_code=status.HTTP_201_CREATED)
async def create_action(body: ActionCreate, db: DbSession, _current_user: CurrentUser):
    action = Action(name=body.name, message=body.message)
    db.add(action)
    await db.flush()
    await db.refresh(action)
    await sio.emit("mutate", {"entity": "actions"})
    return action


@router.patch("/{action_id}", response_model=ActionRead)
async def update_action(action_id: int, body: ActionUpdate, db: DbSession, _current_user: CurrentUser):
    result = await db.execute(select(Action).where(Action.id == action_id))
    action = result.scalar_one_or_none()
    if not action:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Action not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(action, field, value)
    await db.flush()
    await db.refresh(action)
    await sio.emit("mutate", {"entity": "actions"})
    return action


@router.delete("/{action_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_action(action_id: int, db: DbSession, _current_user: CurrentUser):
    result = await db.execute(select(Action).where(Action.id == action_id))
    action = result.scalar_one_or_none()
    if not action:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Action not found")
    await db.delete(action)
    await sio.emit("mutate", {"entity": "actions"})
