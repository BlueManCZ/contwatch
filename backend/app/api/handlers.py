import asyncio
import copy
import json
import logging
from typing import Any
from urllib.parse import urlsplit

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.dependencies import CurrentUser, DbSession, HandlerManagerDep
from app.handlers.registry import (
    get_available_handler_types,
    get_categories,
    get_category,
    get_handler_class,
    get_handlers_by_category,
)
from app.models.action import Action
from app.models.attribute import Attribute
from app.models.handler import Handler
from app.schemas.handler import (
    CategoryInfo,
    HandlerCreate,
    HandlerRead,
    HandlerReorderRequest,
    HandlerStatus,
    HandlerTypeInfo,
    HandlerUpdate,
    ProbeRequest,
    ProbeResult,
    ResolvedControl,
    SerialPortInfo,
    SetupRequest,
)
from app.socketio_app import sio
from app.utils.linearize import linearize
from app.utils.network import get_lan_ip

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/handlers", tags=["handlers"])


def _normalize_config(config: dict) -> None:
    """Ensure the host field has a scheme prefix and split path into fetch_route."""
    host = config.get("host")
    if not isinstance(host, str) or not host:
        return

    if not host.startswith(("http://", "https://")):
        host = f"http://{host}"

    parts = urlsplit(host)
    if parts.path and parts.path != "/" and not config.get("fetch_route"):
        config["fetch_route"] = parts.path
        host = f"{parts.scheme}://{parts.netloc}"

    config["host"] = host.rstrip("/")


_HANDLER_LOAD_OPTIONS = [selectinload(Handler.attributes), selectinload(Handler.actions)]


def _to_handler_read(handler: Handler) -> HandlerRead:
    cls = get_handler_class(handler.type)
    description = cls.describe(handler.options) if cls else handler.type
    data = HandlerRead.model_validate(handler)
    data.description = description
    return data


@router.get("/", response_model=list[HandlerRead])
async def list_handlers(db: DbSession, _current_user: CurrentUser):
    result = await db.execute(
        select(Handler).options(*_HANDLER_LOAD_OPTIONS).order_by(Handler.order.asc().nullslast(), Handler.id.asc())
    )
    return [_to_handler_read(h) for h in result.scalars().all()]


@router.get("/statuses", response_model=dict[int, HandlerStatus])
async def all_handler_statuses(manager: HandlerManagerDep, _current_user: CurrentUser):
    return manager.get_all_handler_statuses()


@router.get("/types", response_model=list[HandlerTypeInfo])
async def list_handler_types(_current_user: CurrentUser):
    return get_available_handler_types()


@router.get("/categories", response_model=list[CategoryInfo])
async def list_categories(_current_user: CurrentUser):
    categories = copy.deepcopy(get_categories())
    for cat in categories:
        if cat["name"] == "http":
            for field in cat["probe_fields"]:
                if field["key"] == "host" and field.get("default") is None:
                    field["default"] = get_lan_ip()
        elif cat["name"] == "serial":
            try:
                from serial.tools.list_ports import comports

                all_ports = await asyncio.to_thread(comports)
                choices = []
                for p in all_ports:
                    if p.hwid == "n/a":
                        continue
                    has_desc = p.description and p.description != "n/a"
                    label = f"{p.device} — {p.description}" if has_desc else p.device
                    choices.append({"value": p.device, "label": label})
            except ImportError:
                choices = []
            for field in cat["probe_fields"]:
                if field["key"] == "port":
                    field["choices"] = choices or None
    return categories


@router.get("/serial-ports", response_model=list[SerialPortInfo])
async def list_serial_ports(_current_user: CurrentUser):
    try:
        from serial.tools.list_ports import comports

        ports = await asyncio.to_thread(comports)
        return [{"device": p.device, "description": p.description} for p in ports if p.hwid != "n/a"]
    except ImportError:
        return []


@router.post("/probe", response_model=ProbeResult)
async def probe_handler(body: ProbeRequest, _current_user: CurrentUser):
    _normalize_config(body.config)
    handlers = get_handlers_by_category(body.category)
    if not handlers:
        return ProbeResult(detected=False)

    # Skip the generic fallback handler — it should not count as a specific detection.
    cat = get_category(body.category)
    default_type = cat["default_handler_type"] if cat else None

    for cls in handlers:
        if cls.handler_type == default_type:
            continue
        try:
            detected = await asyncio.wait_for(cls.probe(body.config), timeout=10)
        except Exception:
            logger.debug("Probe failed for %s", cls.handler_type, exc_info=True)
            detected = False

        if detected:
            return ProbeResult(
                detected=True,
                handler_type=cls.handler_type,
                handler_name=cls.handler_name,
                handler_icon=cls.handler_icon,
                config_fields=[
                    {
                        "key": f["key"],
                        "type": f["type"],
                        "label": f["label"],
                        "default": body.config.get(f["key"], f.get("default")),
                    }
                    for f in cls.config_fields
                ],
                known_attributes=[
                    {
                        "name": a.name,
                        "label": a.label,
                        "unit": a.unit,
                        "icon": a.icon,
                        "rounding": a.rounding,
                    }
                    for a in cls.known_attributes
                ],
                known_actions=[{"name": a.name, "message": a.message} for a in cls.known_actions],
            )

    # Generic HTTP fallback: try to fetch the URL and discover attributes from JSON
    if body.category == "http":
        host = body.config.get("host", "")
        fetch_route = body.config.get("fetch_route", "/")
        if host:
            url = f"{host.rstrip('/')}/{fetch_route.lstrip('/')}"
            try:
                import httpx

                async with httpx.AsyncClient(timeout=5) as client:
                    resp = await client.get(url)
                    resp.raise_for_status()
                    data = resp.json()

                flat = linearize(data)
                default_cls = get_handler_class(default_type) if default_type else None
                return ProbeResult(
                    detected=True,
                    handler_type=default_type or "http",
                    handler_name=default_cls.handler_name if default_cls else "HTTP API",
                    handler_icon=default_cls.handler_icon if default_cls else "globe",
                    config_fields=[
                        {
                            "key": f["key"],
                            "type": f["type"],
                            "label": f["label"],
                            "default": body.config.get(f["key"], f.get("default")),
                        }
                        for f in (default_cls.config_fields if default_cls else [])
                    ],
                    known_attributes=[{"name": key, "label": key} for key in flat],
                )
            except Exception:
                logger.debug("Generic HTTP probe failed for %s", url, exc_info=True)

    return ProbeResult(detected=False)


@router.post("/setup", response_model=HandlerRead, status_code=status.HTTP_201_CREATED)
async def setup_handler(body: SetupRequest, db: DbSession, manager: HandlerManagerDep, _current_user: CurrentUser):
    _normalize_config(body.config)
    handler = Handler(type=body.type, label=body.label, options={"config": body.config}, enabled=body.enabled)
    db.add(handler)
    await db.flush()

    for attr_info in body.attributes:
        attr = Attribute(
            name=attr_info.name,
            handler_id=handler.id,
            enabled=True,
            label=attr_info.label,
            unit=attr_info.unit,
            icon=attr_info.icon,
            rounding=attr_info.rounding,
        )
        db.add(attr)

    for action_info in body.actions:
        try:
            json.loads(action_info.message)
        except (json.JSONDecodeError, TypeError) as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid action message JSON: {action_info.name}",
            ) from e
        action = Action(name=action_info.name, message=action_info.message, handler_id=handler.id)
        db.add(action)

    await db.flush()
    await db.refresh(handler, attribute_names=["attributes", "actions"])

    for attr in handler.attributes:
        await manager.register_attribute(attr)

    await db.commit()
    await manager.start_handler(handler.id)
    await sio.emit("mutate", {"entity": "handlers"})
    await sio.emit("mutate", {"entity": "actions"})
    return _to_handler_read(handler)


@router.put("/reorder", status_code=204)
async def reorder_handlers(body: HandlerReorderRequest, db: DbSession, _current_user: CurrentUser):
    ids = [item.id for item in body.items]
    result = await db.execute(select(Handler).where(Handler.id.in_(ids)))
    handlers_by_id = {h.id: h for h in result.scalars()}
    for item in body.items:
        if handler := handlers_by_id.get(item.id):
            handler.order = item.order
    await db.commit()
    await sio.emit("mutate", {"entity": "handlers"})


@router.post("/", response_model=HandlerRead, status_code=status.HTTP_201_CREATED)
async def create_handler(body: HandlerCreate, db: DbSession, manager: HandlerManagerDep, _current_user: CurrentUser):
    if "config" in body.options:
        _normalize_config(body.options["config"])
    handler = Handler(**body.model_dump())
    db.add(handler)
    await db.flush()
    await db.refresh(handler, attribute_names=["attributes", "actions"])
    await db.commit()
    await manager.start_handler(handler.id)
    await sio.emit("mutate", {"entity": "handlers"})
    return _to_handler_read(handler)


@router.get("/{handler_id}", response_model=HandlerRead)
async def get_handler(handler_id: int, db: DbSession, _current_user: CurrentUser):
    result = await db.execute(select(Handler).where(Handler.id == handler_id).options(*_HANDLER_LOAD_OPTIONS))
    handler = result.scalar_one_or_none()
    if not handler:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Handler not found")
    return _to_handler_read(handler)


@router.patch("/{handler_id}", response_model=HandlerRead)
async def update_handler(
    handler_id: int, body: HandlerUpdate, db: DbSession, manager: HandlerManagerDep, _current_user: CurrentUser
):
    result = await db.execute(select(Handler).where(Handler.id == handler_id).options(*_HANDLER_LOAD_OPTIONS))
    handler = result.scalar_one_or_none()
    if not handler:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Handler not found")

    update_data = body.model_dump(exclude_unset=True)
    if "options" in update_data and "config" in update_data["options"]:
        _normalize_config(update_data["options"]["config"])
    needs_restart = "options" in update_data

    for field, value in update_data.items():
        setattr(handler, field, value)

    await db.commit()
    await db.refresh(handler, attribute_names=["attributes", "actions"])
    await sio.emit("mutate", {"entity": "handlers"})

    if needs_restart:
        await manager.restart_handler(handler_id)

    return _to_handler_read(handler)


@router.delete("/{handler_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_handler(handler_id: int, db: DbSession, manager: HandlerManagerDep, _current_user: CurrentUser):
    result = await db.execute(select(Handler).where(Handler.id == handler_id))
    handler = result.scalar_one_or_none()
    if not handler:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Handler not found")

    await manager.remove_handler(handler_id)
    await db.delete(handler)
    await db.commit()
    await sio.emit("mutate", {"entity": "handlers"})
    await sio.emit("mutate", {"entity": "actions"})


@router.post("/{handler_id}/start", status_code=status.HTTP_200_OK)
async def start_handler(handler_id: int, db: DbSession, manager: HandlerManagerDep, _current_user: CurrentUser):
    result = await db.execute(select(Handler).where(Handler.id == handler_id))
    handler = result.scalar_one_or_none()
    if not handler:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Handler not found")
    handler.enabled = True
    await db.commit()
    await manager.start_handler(handler_id)
    await sio.emit("mutate", {"entity": "handlers"})
    return {"ok": True}


@router.post("/{handler_id}/stop", status_code=status.HTTP_200_OK)
async def stop_handler(handler_id: int, db: DbSession, manager: HandlerManagerDep, _current_user: CurrentUser):
    result = await db.execute(select(Handler).where(Handler.id == handler_id))
    handler = result.scalar_one_or_none()
    if not handler:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Handler not found")
    handler.enabled = False
    await db.commit()
    await manager.stop_handler(handler_id)
    await sio.emit("mutate", {"entity": "handlers"})
    return {"ok": True}


@router.get("/{handler_id}/status", response_model=HandlerStatus)
async def handler_status(handler_id: int, manager: HandlerManagerDep, _current_user: CurrentUser):
    return manager.get_handler_status(handler_id)


@router.get("/{handler_id}/available-attributes", response_model=dict[str, Any])
async def available_attributes(handler_id: int, manager: HandlerManagerDep, _current_user: CurrentUser):
    return manager.get_available_attributes(handler_id)


@router.get("/{handler_id}/controls", response_model=list[ResolvedControl])
async def handler_controls(handler_id: int, db: DbSession, manager: HandlerManagerDep, _current_user: CurrentUser):
    result = await db.execute(select(Handler).where(Handler.id == handler_id).options(*_HANDLER_LOAD_OPTIONS))
    handler = result.scalar_one_or_none()
    if not handler:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Handler not found")

    cls = get_handler_class(handler.type)
    if not cls or not cls.known_controls:
        return []

    attrs_by_name = {a.name: a for a in handler.attributes}
    actions_by_name = {a.name: a for a in handler.actions}
    values = manager.get_current_values()

    controls = []
    for kc in cls.known_controls:
        attr = attrs_by_name.get(kc.state_attribute)
        attr_id = attr.id if attr else None
        live_val = values.get(attr_id, {}).get("value") if attr_id else None
        # Fall back to last raw message if attribute is not registered in the DB
        if live_val is None and kc.state_attribute:
            live_val = manager.get_handler_data_value(handler_id, kc.state_attribute)

        if kc.type == "switch":
            act_on = actions_by_name.get(kc.action_on) if kc.action_on else None
            act_off = actions_by_name.get(kc.action_off) if kc.action_off else None
            resolved = act_on is not None and act_off is not None
            controls.append(
                ResolvedControl(
                    type=kc.type,
                    key=kc.key,
                    label=kc.label,
                    icon=kc.icon,
                    state_attribute=kc.state_attribute,
                    state_compare=kc.state_compare,
                    action_on=kc.action_on,
                    action_off=kc.action_off,
                    min=kc.min,
                    max=kc.max,
                    step=kc.step,
                    unit=kc.unit,
                    attribute_id=attr_id,
                    action_on_id=act_on.id if act_on else None,
                    action_off_id=act_off.id if act_off else None,
                    action_on_name=act_on.name if act_on else None,
                    action_off_name=act_off.name if act_off else None,
                    resolved=resolved,
                    value=live_val,
                )
            )
        else:
            act = actions_by_name.get(kc.action) if kc.action else None
            resolved = act is not None
            controls.append(
                ResolvedControl(
                    type=kc.type,
                    key=kc.key,
                    label=kc.label,
                    icon=kc.icon,
                    state_attribute=kc.state_attribute,
                    action=kc.action,
                    param_key=kc.param_key,
                    min=kc.min,
                    max=kc.max,
                    step=kc.step,
                    unit=kc.unit,
                    attribute_id=attr_id,
                    action_id=act.id if act else None,
                    action_name=act.name if act else None,
                    resolved=resolved,
                    value=live_val,
                )
            )

    return controls
