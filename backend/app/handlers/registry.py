from typing import TYPE_CHECKING

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
                "config_fields": cls.config_fields,
            }
        )
    return result
