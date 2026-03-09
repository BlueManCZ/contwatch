from fastapi import APIRouter, HTTPException, status
from sqlalchemy import case, select, update
from sqlalchemy.orm import selectinload

from app.dependencies import CurrentUser, DbSession, HandlerManagerDep
from app.handlers.registry import get_handler_class
from app.models.action import Action
from app.models.handler import Handler
from app.models.widget import Widget
from app.schemas.handler import CreateWidgetFromControlRequest
from app.schemas.widget import (
    ButtonExecuteRequest,
    DashboardWidget,
    SliderSetRequest,
    SwitchToggleRequest,
    WidgetCreate,
    WidgetRead,
    WidgetReorderRequest,
    WidgetUpdate,
)
from app.socketio_app import emit_mutate
from app.utils.action_params import merge_params
from app.utils.db import get_or_404

router = APIRouter(prefix="/widgets", tags=["widgets"])


# --- CRUD ---


@router.get("", response_model=list[WidgetRead])
async def list_widgets(db: DbSession, _current_user: CurrentUser):
    result = await db.execute(select(Widget).order_by(Widget.order, Widget.id))
    return result.scalars().all()


@router.post("", response_model=WidgetRead, status_code=status.HTTP_201_CREATED)
async def create_widget(body: WidgetCreate, db: DbSession, _current_user: CurrentUser):
    # Assign order: place at the end
    max_order_result = await db.execute(select(Widget.order).order_by(Widget.order.desc()).limit(1))
    max_order = max_order_result.scalar() or 0

    widget = Widget(
        type=body.type,
        order=max_order + 1,
        name=body.name,
        icon=body.icon,
        attribute_id=body.attribute_id,
        config=body.config,
    )
    db.add(widget)
    await db.commit()
    await db.refresh(widget)
    await emit_mutate("widgets")
    return widget


@router.patch("/{widget_id}", response_model=WidgetRead)
async def update_widget(widget_id: int, body: WidgetUpdate, db: DbSession, _current_user: CurrentUser):
    widget = await get_or_404(db, Widget, widget_id)
    widget.name = body.name
    widget.icon = body.icon
    if body.attribute_id is not None:
        widget.attribute_id = body.attribute_id
    if body.config is not None:
        widget.config = body.config
    await db.commit()
    await db.refresh(widget)
    await emit_mutate("widgets")
    return widget


@router.delete("/{widget_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_widget(widget_id: int, db: DbSession, _current_user: CurrentUser):
    widget = await get_or_404(db, Widget, widget_id)
    await db.delete(widget)
    await db.commit()
    await emit_mutate("widgets")


@router.post("/reorder")
async def reorder_widgets(body: WidgetReorderRequest, db: DbSession, _current_user: CurrentUser):
    if not body.items:
        return {"ok": True}
    ids = [item.id for item in body.items]
    order_map = {item.id: item.order for item in body.items}
    await db.execute(
        update(Widget).where(Widget.id.in_(ids)).values(order=case(order_map, value=Widget.id, else_=Widget.order))
    )
    await db.commit()
    await emit_mutate("widgets")
    return {"ok": True}


# --- Actions ---


@router.post("/{widget_id}/toggle")
async def toggle_switch(
    widget_id: int,
    body: SwitchToggleRequest,
    db: DbSession,
    manager: HandlerManagerDep,
    _current_user: CurrentUser,
):
    widget = await get_or_404(db, Widget, widget_id)
    if widget.type != "switch":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Switch widget not found")

    config = widget.config
    action_id = config.get("action_on_id") if body.value else config.get("action_off_id")
    if not action_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No action configured for {'on' if body.value else 'off'}",
        )

    action = await db.get(Action, action_id)
    if not action:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Action not found")

    handler_id = config.get("handler_id") or action.handler_id
    if not handler_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Handler not found for widget")
    success = await manager.execute_action(handler_id, action.message, action_name=action.name, source="manual")
    if not success:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Action execution failed")
    return {"ok": True}


@router.post("/{widget_id}/set")
async def set_slider(
    widget_id: int,
    body: SliderSetRequest,
    db: DbSession,
    manager: HandlerManagerDep,
    _current_user: CurrentUser,
):
    widget = await get_or_404(db, Widget, widget_id)
    if widget.type != "slider":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slider widget not found")

    config = widget.config
    action_id = config.get("action_id")
    param_key = config.get("param_key")
    if not action_id or not param_key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slider config incomplete")

    action = await db.get(Action, action_id)
    if not action:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Action not found")

    handler_id = config.get("handler_id") or action.handler_id
    if not handler_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Handler not found for widget")
    message = merge_params(action.message, {param_key: body.value})
    success = await manager.execute_action(handler_id, message, action_name=action.name, source="manual")
    if not success:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Action execution failed")
    return {"ok": True}


@router.post("/{widget_id}/execute")
async def execute_button(
    widget_id: int,
    body: ButtonExecuteRequest,
    db: DbSession,
    manager: HandlerManagerDep,
    _current_user: CurrentUser,
):
    widget = await get_or_404(db, Widget, widget_id)
    if widget.type != "button":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Button widget not found")

    config = widget.config
    action_id = config.get("action_id")
    handler_id = config.get("handler_id")
    if not action_id or not handler_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Button config incomplete")

    action = await db.get(Action, action_id)
    if not action:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Action not found")

    message = action.message
    if body.params:
        message = merge_params(message, body.params)

    success = await manager.execute_action(handler_id, message, action_name=action.name, source="manual")
    if not success:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Action execution failed")
    return {"ok": True}


# --- From Control ---


@router.post("/from-control", response_model=WidgetRead, status_code=status.HTTP_201_CREATED)
async def create_widget_from_control(body: CreateWidgetFromControlRequest, db: DbSession, _current_user: CurrentUser):
    handler = await get_or_404(
        db,
        Handler,
        body.handler_id,
        options=[selectinload(Handler.attributes), selectinload(Handler.actions)],
    )

    cls = get_handler_class(handler.type)
    if not cls:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown handler type")

    kc = next((c for c in cls.known_controls if c.key == body.control_key), None)
    if not kc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Control not found")

    actions_by_name = {a.name: a for a in handler.actions}

    # Use registered attribute if available, otherwise store raw key in config
    attrs_by_name = {a.name: a for a in handler.attributes}
    attr = attrs_by_name.get(kc.state_attribute)

    # Assign order at the end
    max_order_result = await db.execute(select(Widget.order).order_by(Widget.order.desc()).limit(1))
    max_order = max_order_result.scalar() or 0

    if kc.type == "switch":
        act_on = actions_by_name.get(kc.action_on) if kc.action_on else None
        act_off = actions_by_name.get(kc.action_off) if kc.action_off else None
        widget = Widget(
            type="switch",
            order=max_order + 1,
            icon=kc.icon,
            attribute_id=attr.id if attr else None,
            config={
                "handler_id": handler.id,
                "state_attribute": kc.state_attribute,
                "attribute_compare": kc.state_compare,
                "action_on_id": act_on.id if act_on else None,
                "action_off_id": act_off.id if act_off else None,
            },
        )
    else:
        act = actions_by_name.get(kc.action) if kc.action else None
        if not act:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Action not registered")
        widget = Widget(
            type="slider",
            order=max_order + 1,
            icon=kc.icon,
            attribute_id=attr.id if attr else None,
            config={
                "handler_id": handler.id,
                "state_attribute": kc.state_attribute,
                "action_id": act.id,
                "param_key": kc.param_key or "",
                "min": kc.min,
                "max": kc.max,
                "step": kc.step,
            },
        )

    db.add(widget)
    await db.commit()
    await db.refresh(widget)
    await emit_mutate("widgets")
    return widget


# --- Dashboard ---


@router.get("/dashboard", response_model=list[DashboardWidget])
async def dashboard(db: DbSession, manager: HandlerManagerDep, _current_user: CurrentUser):
    widget_result = await db.execute(
        select(Widget).options(selectinload(Widget.attribute)).order_by(Widget.order, Widget.id)
    )
    widgets = widget_result.scalars().all()
    values = manager.get_current_values()
    daily_stats = manager.get_daily_stats()

    # Cache handler and action data
    handler_result = await db.execute(select(Handler))
    handler_map = {h.id: h for h in handler_result.scalars().all()}

    # Collect action IDs needed from configs
    action_ids: set[int] = set()
    for w in widgets:
        cfg = w.config
        for key in ("action_on_id", "action_off_id", "action_id"):
            if aid := cfg.get(key):
                action_ids.add(aid)

    action_map: dict[int, Action] = {}
    if action_ids:
        action_result = await db.execute(select(Action).where(Action.id.in_(action_ids)))
        action_map = {a.id: a for a in action_result.scalars().all()}

    status_cache: dict[int, dict] = {}

    def get_cached_status(handler_id: int) -> dict:
        if handler_id not in status_cache:
            status_cache[handler_id] = manager.get_handler_status(handler_id)
        return status_cache[handler_id]

    dashboard_widgets: list[DashboardWidget] = []
    for w in widgets:
        attr = w.attribute
        cfg = w.config

        # Common fields
        common: dict = {
            "id": w.id,
            "type": w.type,
            "order": w.order,
            "name": w.name,
            "icon": w.icon,
        }

        # Resolve handler info + live value from registered attribute or raw handler data
        cfg_handler_id = cfg.get("handler_id")
        if attr:
            val = values.get(attr.id, {})
            h_id = attr.handler_id
            db_handler = handler_map.get(h_id)
            h_status = get_cached_status(h_id)
            common.update(
                handler_id=h_id,
                handler_label=db_handler.label if db_handler else None,
                handler_running=h_status["running"],
                handler_connected=h_status["connected"],
                confirm_actions=db_handler.confirm_actions if db_handler else False,
                attribute_id=attr.id,
                attribute_name=attr.name,
                attribute_label=attr.label,
                value=val.get("value"),
            )
        elif cfg_handler_id:
            db_handler = handler_map.get(cfg_handler_id)
            h_status = get_cached_status(cfg_handler_id)
            state_key = cfg.get("state_attribute", "")
            common.update(
                handler_id=cfg_handler_id,
                handler_label=db_handler.label if db_handler else None,
                handler_running=h_status["running"],
                handler_connected=h_status["connected"],
                confirm_actions=db_handler.confirm_actions if db_handler else False,
                attribute_name=state_key,
                **(manager.get_handler_data_value(cfg_handler_id, state_key) if state_key else {}),
            )

        if w.type == "sparkline" and attr:
            common.update(
                unit=attr.unit,
                color=attr.color,
                rounding=attr.rounding,
            )
            if not w.icon:
                common["icon"] = attr.icon

        elif w.type == "tile" and attr:
            val = values.get(attr.id, {})
            stats = daily_stats.get(attr.id, {})
            common.update(
                unit=attr.unit,
                color=attr.color,
                rounding=attr.rounding,
                trend=val.get("trend", 0),
                daily_min=stats.get("min"),
                daily_max=stats.get("max"),
                stats_stale=stats.get("stale", False),
                last_changed=val.get("last_changed"),
            )
            # Tile icon/color come from attribute
            if not w.icon:
                common["icon"] = attr.icon

        elif w.type == "switch":
            act_on = action_map.get(cfg.get("action_on_id")) if cfg.get("action_on_id") else None
            act_off = action_map.get(cfg.get("action_off_id")) if cfg.get("action_off_id") else None
            common.update(
                attribute_compare=cfg.get("attribute_compare"),
                action_on_id=cfg.get("action_on_id"),
                action_off_id=cfg.get("action_off_id"),
                action_on_name=act_on.name if act_on else None,
                action_off_name=act_off.name if act_off else None,
            )

        elif w.type == "slider":
            act = action_map.get(cfg.get("action_id"))
            common.update(
                action_id=cfg.get("action_id"),
                action_name=act.name if act else None,
                param_key=cfg.get("param_key"),
                min=cfg.get("min", 0),
                max=cfg.get("max", 100),
                step=cfg.get("step", 1),
                unit=attr.unit if attr else None,
            )

        elif w.type == "button":
            act = action_map.get(cfg.get("action_id"))
            handler_id = cfg.get("handler_id")
            db_handler = handler_map.get(handler_id) if handler_id else None
            common.update(
                handler_id=handler_id,
                handler_label=db_handler.label if db_handler else None,
                handler_running=get_cached_status(handler_id)["running"] if handler_id else False,
                handler_connected=get_cached_status(handler_id)["connected"] if handler_id else False,
                confirm_actions=db_handler.confirm_actions if db_handler else False,
                action_id=cfg.get("action_id"),
                action_name=act.name if act else None,
            )

        dashboard_widgets.append(DashboardWidget(**common))

    return dashboard_widgets
