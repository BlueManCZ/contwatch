from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.dependencies import CurrentUser, DbSession, HandlerManagerDep
from app.handlers.registry import get_available_handler_types
from app.models.handler import Handler
from app.schemas.handler import HandlerCreate, HandlerRead, HandlerStatus, HandlerTypeInfo, HandlerUpdate
from app.socketio_app import sio

router = APIRouter(prefix="/handlers", tags=["handlers"])


@router.get("/", response_model=list[HandlerRead])
async def list_handlers(db: DbSession, _current_user: CurrentUser):
    result = await db.execute(select(Handler).options(selectinload(Handler.attributes)))
    return result.scalars().all()


@router.get("/types", response_model=list[HandlerTypeInfo])
async def list_handler_types(_current_user: CurrentUser):
    return get_available_handler_types()


@router.get("/{handler_id}", response_model=HandlerRead)
async def get_handler(handler_id: int, db: DbSession, _current_user: CurrentUser):
    result = await db.execute(select(Handler).where(Handler.id == handler_id).options(selectinload(Handler.attributes)))
    handler = result.scalar_one_or_none()
    if not handler:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Handler not found")
    return handler


@router.post("/", response_model=HandlerRead, status_code=status.HTTP_201_CREATED)
async def create_handler(body: HandlerCreate, db: DbSession, _current_user: CurrentUser):
    handler = Handler(**body.model_dump())
    db.add(handler)
    await db.flush()
    await db.refresh(handler, attribute_names=["attributes"])
    await sio.emit("mutate", {"entity": "handlers"})
    return handler


@router.patch("/{handler_id}", response_model=HandlerRead)
async def update_handler(
    handler_id: int, body: HandlerUpdate, db: DbSession, manager: HandlerManagerDep, _current_user: CurrentUser
):
    result = await db.execute(select(Handler).where(Handler.id == handler_id).options(selectinload(Handler.attributes)))
    handler = result.scalar_one_or_none()
    if not handler:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Handler not found")

    update_data = body.model_dump(exclude_unset=True)
    needs_restart = "options" in update_data

    for field, value in update_data.items():
        setattr(handler, field, value)

    await db.commit()
    await db.refresh(handler, attribute_names=["attributes"])
    await sio.emit("mutate", {"entity": "handlers"})

    if needs_restart:
        await manager.restart_handler(handler_id)

    return handler


@router.delete("/{handler_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_handler(handler_id: int, db: DbSession, _current_user: CurrentUser):
    result = await db.execute(select(Handler).where(Handler.id == handler_id))
    handler = result.scalar_one_or_none()
    if not handler:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Handler not found")

    await db.delete(handler)
    await sio.emit("mutate", {"entity": "handlers"})


@router.post("/{handler_id}/start", status_code=status.HTTP_200_OK)
async def start_handler(handler_id: int, manager: HandlerManagerDep, _current_user: CurrentUser):
    await manager.start_handler(handler_id)
    return {"ok": True}


@router.post("/{handler_id}/stop", status_code=status.HTTP_200_OK)
async def stop_handler(handler_id: int, manager: HandlerManagerDep, _current_user: CurrentUser):
    await manager.stop_handler(handler_id)
    return {"ok": True}


@router.get("/{handler_id}/status", response_model=HandlerStatus)
async def handler_status(handler_id: int, manager: HandlerManagerDep, _current_user: CurrentUser):
    return manager.get_handler_status(handler_id)


@router.get("/{handler_id}/available-attributes", response_model=list[str])
async def available_attributes(handler_id: int, manager: HandlerManagerDep, _current_user: CurrentUser):
    return manager.get_available_attributes(handler_id)
