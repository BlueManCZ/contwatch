from dataclasses import dataclass


@dataclass(frozen=True)
class PortDef:
    name: str  # handle ID ("event", "value", "handler_id")
    type: str  # port type for validation ("event", "value")
    label: str  # display name
    color: str = ""  # handle color
    control: str = ""  # "text", "number", "select", or "" for no control
    options: tuple = ()  # static select options; () means dynamic (populated by API)
    data_key: str = ""  # key in flat node data; defaults to name
    dynamic: bool = False  # when True, frontend renders auto-growing numbered instances

    def __post_init__(self):
        if not self.data_key:
            object.__setattr__(self, "data_key", self.name)


def event_port(name: str = "event", label: str = "Event") -> PortDef:
    return PortDef(name=name, type="event", label=label, color="yellow")


def value_port(name: str = "value", label: str = "Value") -> PortDef:
    return PortDef(name=name, type="value", label=label, color="blue", control="text")


def handler_port(name: str = "handler_id", label: str = "Handler") -> PortDef:
    return PortDef(name=name, type="handler", label=label, control="select")  # options=() -> dynamic


def action_handler_port(name: str = "handler_id", label: str = "Handler") -> PortDef:
    return PortDef(name=name, type="action_handler", label=label, control="select")


def attribute_port(name: str = "attribute_id", label: str = "Attribute") -> PortDef:
    return PortDef(name=name, type="attribute", label=label, control="select")


def handler_data_key_port(name: str = "key", label: str = "Key") -> PortDef:
    return PortDef(name=name, type="handler_data_key", label=label, control="tree-select")


def action_port(name: str = "action_id", label: str = "Action") -> PortDef:
    return PortDef(name=name, type="action", label=label, control="select")


def operator_port(name: str = "operator", label: str = "Operator") -> PortDef:
    return PortDef(
        name=name,
        type="operator",
        label=label,
        control="select",
        options=(">=", "<=", ">", "<", "==", "<>"),
    )


def checkbox_port(name: str, label: str) -> PortDef:
    return PortDef(name=name, type="checkbox", label=label, control="checkbox")


def aggregate_port(name: str = "function", label: str = "Function") -> PortDef:
    return PortDef(
        name=name,
        type="aggregate",
        label=label,
        control="select",
        options=("Minimum", "Maximum", "Summation", "Average", "Median"),
    )
