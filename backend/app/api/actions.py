from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.dependencies import CurrentUser, DbSession, HandlerManagerDep
from app.models.action import Action
from app.schemas.action import ActionCreate, ActionRead, ActionUpdate, ExecuteActionRequest
from app.socketio_app import sio
from app.utils.action_params import merge_params

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
    action = Action(name=body.name, message=body.message, handler_id=body.handler_id)
    db.add(action)
    await db.commit()
    await db.refresh(action)
    await sio.emit("mutate", {"entity": "actions"})
    await sio.emit("mutate", {"entity": "handlers"})
    return action


@router.patch("/{action_id}", response_model=ActionRead)
async def update_action(
    action_id: int, body: ActionUpdate, db: DbSession, manager: HandlerManagerDep, _current_user: CurrentUser
):
    result = await db.execute(select(Action).where(Action.id == action_id))
    action = result.scalar_one_or_none()
    if not action:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Action not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(action, field, value)
    await db.commit()
    await db.refresh(action)
    manager.invalidate_action_cache(action_id)
    await sio.emit("mutate", {"entity": "actions"})
    await sio.emit("mutate", {"entity": "handlers"})
    return action


@router.delete("/{action_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_action(action_id: int, db: DbSession, manager: HandlerManagerDep, _current_user: CurrentUser):
    result = await db.execute(select(Action).where(Action.id == action_id))
    action = result.scalar_one_or_none()
    if not action:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Action not found")
    await db.delete(action)
    await db.commit()
    manager.invalidate_action_cache(action_id)
    await sio.emit("mutate", {"entity": "actions"})
    await sio.emit("mutate", {"entity": "handlers"})


@router.post("/{action_id}/execute")
async def execute_action(
    action_id: int,
    db: DbSession,
    manager: HandlerManagerDep,
    _current_user: CurrentUser,
    body: ExecuteActionRequest | None = None,
):
    result = await db.execute(select(Action).where(Action.id == action_id))
    action = result.scalar_one_or_none()
    if not action:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Action not found")
    if not action.handler_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Action has no handler")
    message = action.message
    if body and body.params:
        message = merge_params(message, body.params)
    success = await manager.execute_action(action.handler_id, message, action_name=action.name, source="manual")
    if not success:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Action execution failed")
    return {"ok": True}
