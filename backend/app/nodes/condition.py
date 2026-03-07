from app.nodes.base import AbstractNode
from app.nodes.ports import checkbox_port, event_port, value_port


class Condition(AbstractNode):
    label = "Condition"
    description = "Branches execution based on a value's truthiness"
    input_ports = (event_port(), value_port(), checkbox_port(name="switch", label="Switch"))
    output_ports = (
        event_port(name="true_event", label="True"),
        event_port(name="false_event", label="False"),
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._last_branch: str | None = None

    async def execute(self) -> None:
        value = self.get_input("value")

        # Treat numeric zero and None as falsy
        if value is None:
            truthy = False
        elif isinstance(value, (int, float)):
            truthy = bool(value)
        elif isinstance(value, str):
            truthy = value.lower() not in ("", "0", "false", "none", "null")
        else:
            truthy = bool(value)

        branch = "true_event" if truthy else "false_event"

        # Switch mode: only fire on state changes
        if self.data.get("switch") == "true":
            if branch == self._last_branch:
                return
            self._last_branch = branch

        for node in self.output_connections.get(branch, []):
            await node.execute()
