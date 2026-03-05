from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.dependencies import CurrentUser, DbSession, HandlerManagerDep
from app.handlers.registry import get_handler_class
from app.models.handler import Handler
from app.models.widget_slider import WidgetSlider
from app.models.widget_switch import WidgetSwitch
from app.models.widget_tile import WidgetTile
from app.schemas.handler import CreateWidgetFromControlRequest
from app.schemas.widget import (
    DashboardResponse,
    DashboardSlider,
    DashboardSwitch,
    DashboardTile,
    SliderSetRequest,
    SwitchToggleRequest,
    WidgetSliderCreate,
    WidgetSliderRead,
    WidgetSliderUpdate,
    WidgetSwitchCreate,
    WidgetSwitchRead,
    WidgetSwitchUpdate,
    WidgetTileCreate,
    WidgetTileRead,
    WidgetTileUpdate,
)
from app.socketio_app import sio
from app.utils.action_params import merge_params

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
    await db.commit()
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
    await db.commit()
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
        icon=body.icon,
        attribute_id=body.attribute_id,
        attribute_compare=body.attribute_compare,
        action_on_id=body.action_on_id,
        action_off_id=body.action_off_id,
    )
    db.add(switch)
    await db.commit()
    await db.refresh(switch)
    await sio.emit("mutate", {"entity": "widgets"})
    return switch


@router.patch("/switches/{switch_id}", response_model=WidgetSwitchRead)
async def update_switch(switch_id: int, body: WidgetSwitchUpdate, db: DbSession, _current_user: CurrentUser):
    result = await db.execute(select(WidgetSwitch).where(WidgetSwitch.id == switch_id))
    switch = result.scalar_one_or_none()
    if not switch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Switch not found")
    switch.icon = body.icon
    switch.attribute_id = body.attribute_id
    switch.attribute_compare = body.attribute_compare
    switch.action_on_id = body.action_on_id
    switch.action_off_id = body.action_off_id
    await db.commit()
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
    success = await manager.execute_action(handler_id, action.message, action_name=action.name, source="manual")
    if not success:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Action execution failed")

    return {"ok": True}


# --- Sliders ---


@router.get("/sliders", response_model=list[WidgetSliderRead])
async def list_sliders(db: DbSession, _current_user: CurrentUser):
    result = await db.execute(select(WidgetSlider))
    return result.scalars().all()


@router.post("/sliders", response_model=WidgetSliderRead, status_code=status.HTTP_201_CREATED)
async def create_slider(body: WidgetSliderCreate, db: DbSession, _current_user: CurrentUser):
    slider = WidgetSlider(
        icon=body.icon,
        attribute_id=body.attribute_id,
        action_id=body.action_id,
        param_key=body.param_key,
        min=body.min,
        max=body.max,
        step=body.step,
    )
    db.add(slider)
    await db.commit()
    await db.refresh(slider)
    await sio.emit("mutate", {"entity": "widgets"})
    return slider


@router.patch("/sliders/{slider_id}", response_model=WidgetSliderRead)
async def update_slider(slider_id: int, body: WidgetSliderUpdate, db: DbSession, _current_user: CurrentUser):
    result = await db.execute(select(WidgetSlider).where(WidgetSlider.id == slider_id))
    slider = result.scalar_one_or_none()
    if not slider:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slider not found")
    slider.icon = body.icon
    slider.attribute_id = body.attribute_id
    slider.action_id = body.action_id
    slider.param_key = body.param_key
    slider.min = body.min
    slider.max = body.max
    slider.step = body.step
    await db.commit()
    await db.refresh(slider)
    await sio.emit("mutate", {"entity": "widgets"})
    return slider


@router.delete("/sliders/{slider_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_slider(slider_id: int, db: DbSession, _current_user: CurrentUser):
    result = await db.execute(select(WidgetSlider).where(WidgetSlider.id == slider_id))
    slider = result.scalar_one_or_none()
    if not slider:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slider not found")
    await db.delete(slider)
    await db.commit()
    await sio.emit("mutate", {"entity": "widgets"})


@router.post("/sliders/{slider_id}/set")
async def set_slider(
    slider_id: int,
    body: SliderSetRequest,
    db: DbSession,
    manager: HandlerManagerDep,
    _current_user: CurrentUser,
):
    result = await db.execute(
        select(WidgetSlider)
        .where(WidgetSlider.id == slider_id)
        .options(
            selectinload(WidgetSlider.attribute),
            selectinload(WidgetSlider.action),
        )
    )
    slider = result.scalar_one_or_none()
    if not slider:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slider not found")

    action = slider.action
    handler_id = slider.attribute.handler_id
    message = merge_params(action.message, {slider.param_key: body.value})
    success = await manager.execute_action(handler_id, message, action_name=action.name, source="manual")
    if not success:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Action execution failed")

    return {"ok": True}


# --- From Control ---


@router.post("/from-control", status_code=status.HTTP_201_CREATED)
async def create_widget_from_control(body: CreateWidgetFromControlRequest, db: DbSession, _current_user: CurrentUser):
    result = await db.execute(
        select(Handler)
        .where(Handler.id == body.handler_id)
        .options(selectinload(Handler.attributes), selectinload(Handler.actions))
    )
    handler = result.scalar_one_or_none()
    if not handler:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Handler not found")

    cls = get_handler_class(handler.type)
    if not cls:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown handler type")

    kc = next((c for c in cls.known_controls if c.key == body.control_key), None)
    if not kc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Control not found")

    attrs_by_name = {a.name: a for a in handler.attributes}
    actions_by_name = {a.name: a for a in handler.actions}

    attr = attrs_by_name.get(kc.state_attribute)
    if not attr:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="State attribute not registered")

    if kc.type == "switch":
        act_on = actions_by_name.get(kc.action_on) if kc.action_on else None
        act_off = actions_by_name.get(kc.action_off) if kc.action_off else None
        widget = WidgetSwitch(
            icon=kc.icon,
            attribute_id=attr.id,
            attribute_compare=kc.state_compare,
            action_on_id=act_on.id if act_on else None,
            action_off_id=act_off.id if act_off else None,
        )
        db.add(widget)
        await db.commit()
        await db.refresh(widget)
        await sio.emit("mutate", {"entity": "widgets"})
        return WidgetSwitchRead.model_validate(widget)

    act = actions_by_name.get(kc.action) if kc.action else None
    if not act:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Action not registered")
    widget = WidgetSlider(
        icon=kc.icon,
        attribute_id=attr.id,
        action_id=act.id,
        param_key=kc.param_key or "",
        min=kc.min,
        max=kc.max,
        step=kc.step,
    )
    db.add(widget)
    await db.commit()
    await db.refresh(widget)
    await sio.emit("mutate", {"entity": "widgets"})
    return WidgetSliderRead.model_validate(widget)


# --- Dashboard ---


@router.get("/dashboard", response_model=DashboardResponse)
async def dashboard(db: DbSession, manager: HandlerManagerDep, _current_user: CurrentUser):
    # Fetch tiles
    tile_result = await db.execute(select(WidgetTile).options(selectinload(WidgetTile.attribute)))
    tiles = tile_result.scalars().all()
    values = manager.get_current_values()
    daily_stats = manager.get_daily_stats()

    # Cache handler data to avoid redundant lookups per widget
    handler_result = await db.execute(select(Handler))
    handler_map = {h.id: h for h in handler_result.scalars().all()}
    status_cache: dict[int, dict] = {}

    def get_cached_status(handler_id: int) -> dict:
        if handler_id not in status_cache:
            status_cache[handler_id] = manager.get_handler_status(handler_id)
        return status_cache[handler_id]

    dashboard_tiles = []
    for tile in tiles:
        attr = tile.attribute
        val = values.get(attr.id, {})
        stats = daily_stats.get(attr.id, {})
        h_status = get_cached_status(attr.handler_id)
        dashboard_tiles.append(
            DashboardTile(
                id=tile.id,
                attribute_id=attr.id,
                handler_id=attr.handler_id,
                handler_running=h_status["running"],
                handler_connected=h_status["connected"],
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
                stats_stale=stats.get("stale", False),
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
        h_status = get_cached_status(attr.handler_id)
        db_handler = handler_map.get(attr.handler_id)
        dashboard_switches.append(
            DashboardSwitch(
                id=switch.id,
                name=switch.name,
                icon=switch.icon,
                attribute_id=attr.id,
                handler_id=attr.handler_id,
                handler_label=db_handler.label if db_handler else None,
                handler_running=h_status["running"],
                handler_connected=h_status["connected"],
                confirm_actions=db_handler.confirm_actions if db_handler else False,
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

    # Fetch sliders
    slider_result = await db.execute(
        select(WidgetSlider).options(
            selectinload(WidgetSlider.attribute),
            selectinload(WidgetSlider.action),
        )
    )
    sliders = slider_result.scalars().all()

    dashboard_sliders = []
    for slider in sliders:
        attr = slider.attribute
        val = values.get(attr.id, {})
        h_status = get_cached_status(attr.handler_id)
        db_handler = handler_map.get(attr.handler_id)
        dashboard_sliders.append(
            DashboardSlider(
                id=slider.id,
                name=slider.name,
                icon=slider.icon,
                attribute_id=attr.id,
                handler_id=attr.handler_id,
                handler_label=db_handler.label if db_handler else None,
                handler_running=h_status["running"],
                handler_connected=h_status["connected"],
                confirm_actions=db_handler.confirm_actions if db_handler else False,
                action_id=slider.action_id,
                action_name=slider.action.name,
                param_key=slider.param_key,
                min=slider.min,
                max=slider.max,
                step=slider.step,
                unit=attr.unit,
                attribute_name=attr.name,
                attribute_label=attr.label,
                value=val.get("value"),
            )
        )

    return DashboardResponse(tiles=dashboard_tiles, switches=dashboard_switches, sliders=dashboard_sliders)
