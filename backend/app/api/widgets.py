from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.dependencies import CurrentUser, DbSession, HandlerManagerDep
from app.models.widget_switch import WidgetSwitch
from app.models.widget_tile import WidgetTile
from app.schemas.widget import (
    DashboardResponse,
    DashboardSwitch,
    DashboardTile,
    SwitchToggleRequest,
    WidgetSwitchCreate,
    WidgetSwitchRead,
    WidgetSwitchUpdate,
    WidgetTileCreate,
    WidgetTileRead,
    WidgetTileUpdate,
)
from app.socketio_app import sio

router = APIRouter(prefix="/widgets", tags=["widgets"])


# --- Tiles ---


@router.get("/tiles", response_model=list[WidgetTileRead])
async def list_tiles(db: DbSession, _current_user: CurrentUser):
    result = await db.execute(select(WidgetTile))
    return result.scalars().all()


@router.post("/tiles", response_model=WidgetTileRead, status_code=status.HTTP_201_CREATED)
async def create_tile(body: WidgetTileCreate, db: DbSession, _current_user: CurrentUser):
    tile = WidgetTile(attribute_id=body.attribute_id)
    db.add(tile)
    await db.flush()
    await db.refresh(tile)
    await sio.emit("mutate", {"entity": "widgets"})
    return tile


@router.patch("/tiles/{tile_id}", response_model=WidgetTileRead)
async def update_tile(tile_id: int, body: WidgetTileUpdate, db: DbSession, _current_user: CurrentUser):
    result = await db.execute(select(WidgetTile).where(WidgetTile.id == tile_id))
    tile = result.scalar_one_or_none()
    if not tile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tile not found")
    tile.attribute_id = body.attribute_id
    await db.flush()
    await db.refresh(tile)
    await sio.emit("mutate", {"entity": "widgets"})
    return tile


@router.delete("/tiles/{tile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tile(tile_id: int, db: DbSession, _current_user: CurrentUser):
    result = await db.execute(select(WidgetTile).where(WidgetTile.id == tile_id))
    tile = result.scalar_one_or_none()
    if not tile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tile not found")
    await db.delete(tile)
    await db.commit()
    await sio.emit("mutate", {"entity": "widgets"})


# --- Switches ---


@router.get("/switches", response_model=list[WidgetSwitchRead])
async def list_switches(db: DbSession, _current_user: CurrentUser):
    result = await db.execute(select(WidgetSwitch))
    return result.scalars().all()


@router.post("/switches", response_model=WidgetSwitchRead, status_code=status.HTTP_201_CREATED)
async def create_switch(body: WidgetSwitchCreate, db: DbSession, _current_user: CurrentUser):
    switch = WidgetSwitch(
        name=body.name,
        icon=body.icon,
        attribute_id=body.attribute_id,
        attribute_compare=body.attribute_compare,
        action_on_id=body.action_on_id,
        action_off_id=body.action_off_id,
    )
    db.add(switch)
    await db.flush()
    await db.refresh(switch)
    await sio.emit("mutate", {"entity": "widgets"})
    return switch


@router.patch("/switches/{switch_id}", response_model=WidgetSwitchRead)
async def update_switch(switch_id: int, body: WidgetSwitchUpdate, db: DbSession, _current_user: CurrentUser):
    result = await db.execute(select(WidgetSwitch).where(WidgetSwitch.id == switch_id))
    switch = result.scalar_one_or_none()
    if not switch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Switch not found")
    switch.name = body.name
    switch.icon = body.icon
    switch.attribute_id = body.attribute_id
    switch.attribute_compare = body.attribute_compare
    switch.action_on_id = body.action_on_id
    switch.action_off_id = body.action_off_id
    await db.flush()
    await db.refresh(switch)
    await sio.emit("mutate", {"entity": "widgets"})
    return switch


@router.delete("/switches/{switch_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_switch(switch_id: int, db: DbSession, _current_user: CurrentUser):
    result = await db.execute(select(WidgetSwitch).where(WidgetSwitch.id == switch_id))
    switch = result.scalar_one_or_none()
    if not switch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Switch not found")
    await db.delete(switch)
    await db.commit()
    await sio.emit("mutate", {"entity": "widgets"})


@router.post("/switches/{switch_id}/toggle")
async def toggle_switch(
    switch_id: int,
    body: SwitchToggleRequest,
    db: DbSession,
    manager: HandlerManagerDep,
    _current_user: CurrentUser,
):
    result = await db.execute(
        select(WidgetSwitch)
        .where(WidgetSwitch.id == switch_id)
        .options(
            selectinload(WidgetSwitch.attribute),
            selectinload(WidgetSwitch.action_on),
            selectinload(WidgetSwitch.action_off),
        )
    )
    switch = result.scalar_one_or_none()
    if not switch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Switch not found")

    action = switch.action_on if body.value else switch.action_off
    if not action:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No action configured for {'on' if body.value else 'off'}",
        )

    handler_id = switch.attribute.handler_id
    success = await manager.execute_action(handler_id, action.message)
    if not success:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Action execution failed")

    return {"ok": True}


# --- Dashboard ---


@router.get("/dashboard", response_model=DashboardResponse)
async def dashboard(db: DbSession, manager: HandlerManagerDep, _current_user: CurrentUser):
    # Fetch tiles
    tile_result = await db.execute(select(WidgetTile).options(selectinload(WidgetTile.attribute)))
    tiles = tile_result.scalars().all()
    values = manager.get_current_values()
    daily_stats = manager.get_daily_stats()

    dashboard_tiles = []
    for tile in tiles:
        attr = tile.attribute
        val = values.get(attr.id, {})
        stats = daily_stats.get(attr.id, {})
        dashboard_tiles.append(
            DashboardTile(
                id=tile.id,
                attribute_id=attr.id,
                handler_id=attr.handler_id,
                handler_running=manager.get_handler_status(attr.handler_id)["running"],
                handler_connected=manager.get_handler_status(attr.handler_id)["connected"],
                name=attr.name,
                label=attr.label,
                unit=attr.unit,
                icon=attr.icon,
                color=attr.color,
                rounding=attr.rounding,
                value=val.get("value"),
                trend=val.get("trend", 0),
                daily_min=stats.get("min"),
                daily_max=stats.get("max"),
                last_changed=val.get("last_changed"),
            )
        )

    # Fetch switches
    switch_result = await db.execute(
        select(WidgetSwitch).options(
            selectinload(WidgetSwitch.attribute),
            selectinload(WidgetSwitch.action_on),
            selectinload(WidgetSwitch.action_off),
        )
    )
    switches = switch_result.scalars().all()

    dashboard_switches = []
    for switch in switches:
        attr = switch.attribute
        val = values.get(attr.id, {})
        dashboard_switches.append(
            DashboardSwitch(
                id=switch.id,
                name=switch.name,
                icon=switch.icon,
                attribute_id=attr.id,
                handler_id=attr.handler_id,
                handler_running=manager.get_handler_status(attr.handler_id)["running"],
                handler_connected=manager.get_handler_status(attr.handler_id)["connected"],
                attribute_compare=switch.attribute_compare,
                action_on_id=switch.action_on_id,
                action_off_id=switch.action_off_id,
                attribute_name=attr.name,
                attribute_label=attr.label,
                action_on_name=switch.action_on.name if switch.action_on else None,
                action_off_name=switch.action_off.name if switch.action_off else None,
                value=val.get("value"),
            )
        )

    return DashboardResponse(tiles=dashboard_tiles, switches=dashboard_switches)
