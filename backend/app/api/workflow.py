import logging

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.dependencies import CurrentUser, DbSession, HandlerManagerDep
from app.handlers.registry import get_handler_class
from app.models.action import Action
from app.models.attribute import Attribute
from app.models.handler import Handler
from app.models.settings import Settings
from app.nodes import NODES
from app.nodes.graph import CycleDetectedError
from app.schemas.workflow import NodeDefinition, WorkflowData

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/actions/workflow", tags=["workflow"])


@router.get("/nodes", response_model=list[NodeDefinition])
async def get_node_definitions(db: DbSession, _current_user: CurrentUser, manager: HandlerManagerDep):
    """Return all node type definitions with dynamic select options populated."""
    # Load dynamic options from DB
    handlers_result = await db.execute(
        select(Handler.id, Handler.type, Handler.label).order_by(Handler.order.asc().nullslast(), Handler.id.asc())
    )
    handlers = [(row[0], row[1], row[2]) for row in handlers_result.all()]
    handler_options = [
        {"value": str(h_id), "label": h_label or (cls.handler_name if (cls := get_handler_class(h_type)) else h_type)}
        for h_id, h_type, h_label in handlers
    ]

    attributes_result = await db.execute(select(Attribute.id, Attribute.name, Attribute.label))
    attributes = [(row[0], row[1], row[2]) for row in attributes_result.all()]
    attribute_options = [{"value": str(a_id), "label": a_label or a_name} for a_id, a_name, a_label in attributes]

    actions_result = await db.execute(select(Action.id, Action.name, Action.handler_id))
    actions = [(row[0], row[1], row[2]) for row in actions_result.all()]
    action_options = [
        {"value": str(a_id), "label": a_name, "group": str(a_hid)}
        for a_id, a_name, a_hid in actions
        if a_hid is not None
    ]

    # Handlers that have at least one action (for ActionPerformer node)
    handler_ids_with_actions = {a_hid for _, _, a_hid in actions if a_hid is not None}
    action_handler_options = [
        {"value": str(h_id), "label": h_label or (cls.handler_name if (cls := get_handler_class(h_type)) else h_type)}
        for h_id, h_type, h_label in handlers
        if h_id in handler_ids_with_actions
    ]

    dynamic_options = {
        "handler": handler_options,
        "action_handler": action_handler_options,
        "attribute": attribute_options,
        "action": action_options,
        "handler_data_key": manager.get_all_data_keys(),
    }

    definitions = []
    for node_cls in NODES:
        defn = node_cls.get_definition()
        # Inject dynamic options for select ports with empty options
        for port in defn["input_ports"]:
            if port["control"] in ("select", "tree-select") and not port["options"]:
                port["options"] = dynamic_options.get(port["type"], [])
        definitions.append(defn)

    return definitions


@router.get("/", response_model=WorkflowData)
async def get_workflow(db: DbSession, _current_user: CurrentUser):
    """Load saved workflow from Settings."""
    result = await db.execute(select(Settings).limit(1))
    settings = result.scalar_one_or_none()
    if not settings or not settings.actions_node_map:
        return WorkflowData()
    return settings.actions_node_map


@router.put("/", response_model=WorkflowData)
async def save_workflow(body: WorkflowData, db: DbSession, _current_user: CurrentUser, manager: HandlerManagerDep):
    """Validate and save workflow, then rebuild the execution graph."""
    workflow_dict = body.model_dump(by_alias=True)

    # Validate by building the graph (detects cycles, unknown types) without installing it
    try:
        graph = manager.build_workflow(workflow_dict)
    except CycleDetectedError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": str(e), "node_id": e.node_id},
        ) from e

    # Persist to DB before installing the in-memory graph
    result = await db.execute(select(Settings).limit(1))
    settings = result.scalar_one_or_none()
    if settings:
        settings.actions_node_map = workflow_dict
    else:
        settings = Settings(user_id=0, actions_node_map=workflow_dict)
        db.add(settings)
    await db.flush()

    # Only install after DB succeeds — keeps in-memory and DB state consistent
    manager.install_workflow(graph)
    logger.info("Workflow saved and rebuilt successfully")
    return workflow_dict
