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
                "known_actions": [
                    {
                        "name": a.name,
                        "message": a.message,
                        "params": [
                            {
                                "key": p.key,
                                "label": p.label,
                                "type": p.type,
                                "min": p.min,
                                "max": p.max,
                                "step": p.step,
                                "unit": p.unit,
                                "default": p.default,
                            }
                            for p in a.params
                        ],
                    }
                    for a in cls.known_actions
                ],
                "known_controls": [
                    {
                        "type": c.type,
                        "key": c.key,
                        "label": c.label,
                        "icon": c.icon,
                        "state_attribute": c.state_attribute,
                        "state_compare": c.state_compare,
                        "action_on": c.action_on,
                        "action_off": c.action_off,
                        "action": c.action,
                        "param_key": c.param_key,
                        "min": c.min,
                        "max": c.max,
                        "step": c.step,
                        "unit": c.unit,
                    }
                    for c in cls.known_controls
                ],
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


def get_category(name: str) -> dict[str, Any] | None:
    return _categories.get(name)


register_category(
    "http",
    label="HTTP",
    icon="globe",
    default_handler_type="http",
    default_label="HTTP API",
    probe_fields=[
        {"key": "host", "type": "string", "label": "Device URL / IP", "default": None},
    ],
)

register_category(
    "serial",
    label="Serial",
    icon="cable",
    default_handler_type="serial",
    default_label="Serial device",
    probe_fields=[
        {"key": "port", "type": "string", "label": "Serial Port", "choices": None},
    ],
)
