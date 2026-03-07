from pydantic import BaseModel, Field


class PortOption(BaseModel):
    value: str
    label: str
    group: str = ""
    display_label: str = ""


class PortDefinition(BaseModel):
    name: str
    type: str
    label: str
    color: str = ""
    control: str = ""
    options: list[PortOption] = []
    data_key: str = ""


class NodeDefinition(BaseModel):
    type: str
    label: str
    description: str
    input_ports: list[PortDefinition]
    output_ports: list[PortDefinition]


class WorkflowNode(BaseModel):
    id: str
    type: str
    position: dict
    data: dict = {}


class WorkflowEdge(BaseModel):
    model_config = {"populate_by_name": True}

    id: str
    source: str
    target: str
    source_handle: str = Field("", alias="sourceHandle")
    target_handle: str = Field("", alias="targetHandle")


class WorkflowData(BaseModel):
    nodes: list[WorkflowNode] = []
    edges: list[WorkflowEdge] = []
