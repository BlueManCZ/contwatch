import logging

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.dependencies import CurrentUser, DbSession, HandlerManagerDep
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
async def get_node_definitions(db: DbSession, _current_user: CurrentUser):
    """Return all node type definitions with dynamic select options populated."""
    # Load dynamic options from DB
    handlers_result = await db.execute(select(Handler.id, Handler.type))
    handlers = [(row[0], row[1]) for row in handlers_result.all()]
    handler_options = [f"{h_id}: {h_type}" for h_id, h_type in handlers]

    attributes_result = await db.execute(select(Attribute.id, Attribute.name))
    attributes = [(row[0], row[1]) for row in attributes_result.all()]
    attribute_options = [f"{a_id}: {a_name}" for a_id, a_name in attributes]

    actions_result = await db.execute(select(Action.id, Action.name))
    actions = [(row[0], row[1]) for row in actions_result.all()]
    action_options = [f"{a_id}: {a_name}" for a_id, a_name in actions]

    dynamic_options = {
        "handler": handler_options,
        "attribute": attribute_options,
        "action": action_options,
    }

    definitions = []
    for node_cls in NODES:
        defn = node_cls.get_definition()
        # Inject dynamic options for select ports with empty options
        for port in defn["input_ports"]:
            if port["control"] == "select" and not port["options"]:
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

    # Validate by attempting to build the graph (detects cycles, unknown types)
    try:
        manager.rebuild_workflow(workflow_dict)
    except CycleDetectedError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)) from e

    # Save to DB
    result = await db.execute(select(Settings).limit(1))
    settings = result.scalar_one_or_none()
    if settings:
        settings.actions_node_map = workflow_dict
    else:
        settings = Settings(user_id=0, actions_node_map=workflow_dict)
        db.add(settings)

    await db.flush()
    logger.info("Workflow saved and rebuilt successfully")
    return workflow_dict
