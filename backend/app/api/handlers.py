import asyncio
import copy
import json
import logging

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.dependencies import CurrentUser, DbSession, HandlerManagerDep
from app.handlers.registry import (
    get_available_handler_types,
    get_categories,
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
    HandlerStatus,
    HandlerTypeInfo,
    HandlerUpdate,
    ProbeRequest,
    ProbeResult,
    SerialPortInfo,
    SetupRequest,
)
from app.socketio_app import sio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/handlers", tags=["handlers"])


def _normalize_config(config: dict) -> dict:
    """Ensure the host field has a scheme prefix."""
    host = config.get("host")
    if isinstance(host, str) and host and not host.startswith(("http://", "https://")):
        config["host"] = f"http://{host}"
    return config

_HANDLER_LOAD_OPTIONS = [selectinload(Handler.attributes), selectinload(Handler.actions)]


def _to_handler_read(handler: Handler) -> HandlerRead:
    cls = get_handler_class(handler.type)
    description = cls.describe(handler.options) if cls else handler.type
    data = HandlerRead.model_validate(handler)
    data.description = description
    return data


@router.get("/", response_model=list[HandlerRead])
async def list_handlers(db: DbSession, _current_user: CurrentUser):
    result = await db.execute(select(Handler).options(*_HANDLER_LOAD_OPTIONS))
    return [_to_handler_read(h) for h in result.scalars().all()]


@router.get("/statuses", response_model=dict[int, HandlerStatus])
async def all_handler_statuses(manager: HandlerManagerDep, _current_user: CurrentUser):
    return manager.get_all_handler_statuses()


@router.get("/types", response_model=list[HandlerTypeInfo])
async def list_handler_types(_current_user: CurrentUser):
    return get_available_handler_types()


@router.get("/categories", response_model=list[CategoryInfo])
async def list_categories(_current_user: CurrentUser):
    from app.api.system import _get_lan_ip

    categories = copy.deepcopy(get_categories())
    for cat in categories:
        if cat["name"] == "http":
            for field in cat["probe_fields"]:
                if field["key"] == "host" and field.get("default") is None:
                    field["default"] = f"http://{_get_lan_ip()}"
        elif cat["name"] == "serial":
            try:
                from serial.tools.list_ports import comports

                ports = await asyncio.to_thread(comports)
                choices = [{"value": p.device, "label": f"{p.device} — {p.description}"} for p in ports]
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
        return [{"device": p.device, "description": p.description} for p in ports]
    except ImportError:
        return []


@router.post("/probe", response_model=ProbeResult)
async def probe_handler(body: ProbeRequest, _current_user: CurrentUser):
    _normalize_config(body.config)
    handlers = get_handlers_by_category(body.category)
    if not handlers:
        return ProbeResult(detected=False)

    for cls in handlers:
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
                    {"key": f["key"], "type": f["type"], "label": f["label"], "default": f.get("default")}
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
async def delete_handler(handler_id: int, db: DbSession, _current_user: CurrentUser):
    result = await db.execute(select(Handler).where(Handler.id == handler_id))
    handler = result.scalar_one_or_none()
    if not handler:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Handler not found")

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
    await manager.start_handler(handler_id)
    return {"ok": True}


@router.post("/{handler_id}/stop", status_code=status.HTTP_200_OK)
async def stop_handler(handler_id: int, db: DbSession, manager: HandlerManagerDep, _current_user: CurrentUser):
    result = await db.execute(select(Handler).where(Handler.id == handler_id))
    handler = result.scalar_one_or_none()
    if not handler:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Handler not found")
    handler.enabled = False
    await manager.stop_handler(handler_id)
    return {"ok": True}


@router.get("/{handler_id}/status", response_model=HandlerStatus)
async def handler_status(handler_id: int, manager: HandlerManagerDep, _current_user: CurrentUser):
    return manager.get_handler_status(handler_id)


@router.get("/{handler_id}/available-attributes", response_model=list[str])
async def available_attributes(handler_id: int, manager: HandlerManagerDep, _current_user: CurrentUser):
    return manager.get_available_attributes(handler_id)
