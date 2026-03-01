from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.handlers.base import AbstractHandler

_registry: dict[str, type["AbstractHandler"]] = {}


def register_handler_type(cls: type["AbstractHandler"]) -> type["AbstractHandler"]:
    """Register a handler class by its handler_type string."""
    _registry[cls.handler_type] = cls
    return cls


def get_handler_class(type_str: str) -> type["AbstractHandler"] | None:
    return _registry.get(type_str)


def get_available_handler_types() -> list[dict]:
    """Return metadata for all registered handler types (for frontend)."""
    result = []
    for cls in _registry.values():
        result.append(
            {
                "type": cls.handler_type,
                "name": cls.handler_name,
                "icon": cls.handler_icon,
                "category": cls.handler_category,
                "config_fields": cls.config_fields,
                "known_actions": [{"name": a.name, "message": a.message} for a in cls.known_actions],
            }
        )
    return result


def get_handlers_by_category(category: str) -> list[type["AbstractHandler"]]:
    """Return handler classes for a category, sorted by probe_priority desc."""
    matches = [cls for cls in _registry.values() if cls.handler_category == category]
    matches.sort(key=lambda c: c.probe_priority, reverse=True)
    return matches


# ---------------------------------------------------------------------------
# Category registry
# ---------------------------------------------------------------------------

_categories: dict[str, dict[str, Any]] = {}


def register_category(
    name: str,
    *,
    label: str,
    icon: str,
    default_handler_type: str,
    default_label: str,
    probe_fields: list[dict[str, Any]],
) -> None:
    _categories[name] = {
        "name": name,
        "label": label,
        "icon": icon,
        "default_handler_type": default_handler_type,
        "default_label": default_label,
        "probe_fields": probe_fields,
    }


def get_categories() -> list[dict[str, Any]]:
    return list(_categories.values())


register_category(
    "http",
    label="HTTP Device",
    icon="globe",
    default_handler_type="http",
    default_label="HTTP API",
    probe_fields=[
        {"key": "host", "type": "string", "label": "Host URL", "default": None},
    ],
)

register_category(
    "serial",
    label="Serial Device",
    icon="cable",
    default_handler_type="serial",
    default_label="Serial device",
    probe_fields=[
        {"key": "port", "type": "string", "label": "Serial Port", "default": None, "choices": None},
        {"key": "baudrate", "type": "int", "label": "Baudrate", "default": 9600},
        {"key": "slave_address", "type": "int", "label": "Slave Address", "default": 4},
    ],
)
