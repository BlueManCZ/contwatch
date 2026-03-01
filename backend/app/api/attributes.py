from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.dependencies import CurrentUser, DbSession, HandlerManagerDep
from app.models.attribute import Attribute
from app.schemas.attribute import (
    AttributeCreate,
    AttributeRead,
    AttributeReorderRequest,
    AttributeUpdate,
    AttributeValue,
)
from app.socketio_app import sio

router = APIRouter(prefix="/attributes", tags=["attributes"])


@router.get("/", response_model=list[AttributeRead])
async def list_attributes(db: DbSession, _current_user: CurrentUser, handler_id: int | None = None):
    query = select(Attribute).order_by(Attribute.order.asc().nullslast(), Attribute.id.asc())
    if handler_id is not None:
        query = query.where(Attribute.handler_id == handler_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/values", response_model=list[AttributeValue])
async def all_attribute_values(manager: HandlerManagerDep, _current_user: CurrentUser):
    values = manager.get_current_values()
    daily_stats = manager.get_daily_stats()

    result = []
    seen: set[int] = set()
    for attr_id, data in values.items():
        seen.add(attr_id)
        stats = daily_stats.get(attr_id, {})
        result.append(
            AttributeValue(
                attribute_id=attr_id,
                value=data["value"],
                trend=data["trend"],
                daily_min=stats.get("min"),
                daily_max=stats.get("max"),
                last_changed=data.get("last_changed"),
            )
        )
    # Include attributes that have daily stats but no current value
    for attr_id, stats in daily_stats.items():
        if attr_id not in seen:
            result.append(
                AttributeValue(
                    attribute_id=attr_id,
                    value=None,
                    trend=0,
                    daily_min=stats.get("min"),
                    daily_max=stats.get("max"),
                )
            )
    return result


@router.put("/reorder", status_code=204)
async def reorder_attributes(body: AttributeReorderRequest, db: DbSession, _current_user: CurrentUser):
    for item in body.items:
        result = await db.execute(select(Attribute).where(Attribute.id == item.id))
        attribute = result.scalar_one_or_none()
        if attribute:
            attribute.order = item.order
    await db.commit()
    await sio.emit("mutate", {"entity": "attributes"})
    await sio.emit("mutate", {"entity": "handlers"})


@router.get("/{attribute_id}", response_model=AttributeRead)
async def get_attribute(attribute_id: int, db: DbSession, _current_user: CurrentUser):
    result = await db.execute(select(Attribute).where(Attribute.id == attribute_id))
    attribute = result.scalar_one_or_none()
    if not attribute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attribute not found")
    return attribute


@router.get("/{attribute_id}/value", response_model=AttributeValue | None)
async def get_attribute_value(attribute_id: int, manager: HandlerManagerDep, _current_user: CurrentUser):
    val = manager.get_attribute_value(attribute_id)
    if val is None:
        return None
    return AttributeValue(attribute_id=attribute_id, **val)


@router.post("/", response_model=AttributeRead, status_code=status.HTTP_201_CREATED)
async def create_attribute(
    body: AttributeCreate, db: DbSession, manager: HandlerManagerDep, _current_user: CurrentUser
):
    attribute = Attribute(**body.model_dump())
    db.add(attribute)
    await db.flush()
    await db.refresh(attribute)
    await manager.register_attribute(attribute)
    await sio.emit("mutate", {"entity": "attributes"})
    return attribute


@router.delete("/{attribute_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attribute(attribute_id: int, db: DbSession, manager: HandlerManagerDep, _current_user: CurrentUser):
    result = await db.execute(select(Attribute).where(Attribute.id == attribute_id))
    attribute = result.scalar_one_or_none()
    if not attribute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attribute not found")

    await manager.unregister_attribute(attribute.handler_id, attribute.name)
    await db.delete(attribute)
    await db.commit()
    await sio.emit("mutate", {"entity": "attributes"})


@router.patch("/{attribute_id}", response_model=AttributeRead)
async def update_attribute(attribute_id: int, body: AttributeUpdate, db: DbSession, _current_user: CurrentUser):
    result = await db.execute(select(Attribute).where(Attribute.id == attribute_id))
    attribute = result.scalar_one_or_none()
    if not attribute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attribute not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(attribute, field, value)

    await db.flush()
    await db.refresh(attribute)
    await sio.emit("mutate", {"entity": "attributes"})
    return attribute
