import logging

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.dependencies import CurrentUser, DbSession, HandlerManagerDep
from app.models.sub_workflow import SubWorkflow
from app.schemas.sub_workflow import (
    SubWorkflowCreate,
    SubWorkflowRead,
    SubWorkflowSummary,
    SubWorkflowUpdate,
)
from app.schemas.workflow import WorkflowData
from app.socketio_app import emit_mutate
from app.utils.db import get_or_404

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sub-workflows", tags=["sub-workflows"])


@router.get("/", response_model=list[SubWorkflowSummary])
async def list_sub_workflows(db: DbSession, _current_user: CurrentUser):
    result = await db.execute(select(SubWorkflow).order_by(SubWorkflow.id.asc()))
    return result.scalars().all()


@router.get("/{sub_workflow_id}", response_model=SubWorkflowRead)
async def get_sub_workflow(sub_workflow_id: int, db: DbSession, _current_user: CurrentUser):
    return await get_or_404(db, SubWorkflow, sub_workflow_id, detail="Sub-workflow not found")


@router.post("/", response_model=SubWorkflowRead, status_code=status.HTTP_201_CREATED)
async def create_sub_workflow(body: SubWorkflowCreate, db: DbSession, current_user: CurrentUser):
    sw = SubWorkflow(name=body.name, description=body.description, user_id=current_user.id)
    db.add(sw)
    await db.commit()
    await db.refresh(sw)
    await emit_mutate("sub_workflows")
    return sw


@router.patch("/{sub_workflow_id}", response_model=SubWorkflowRead)
async def update_sub_workflow(sub_workflow_id: int, body: SubWorkflowUpdate, db: DbSession, _current_user: CurrentUser):
    sw = await get_or_404(db, SubWorkflow, sub_workflow_id, detail="Sub-workflow not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(sw, field, value)
    await db.commit()
    await db.refresh(sw)
    await emit_mutate("sub_workflows")
    return sw


@router.put("/{sub_workflow_id}/graph", response_model=WorkflowData)
async def save_sub_workflow_graph(
    sub_workflow_id: int,
    body: WorkflowData,
    db: DbSession,
    _current_user: CurrentUser,
    manager: HandlerManagerDep,
):
    sw = await get_or_404(db, SubWorkflow, sub_workflow_id, detail="Sub-workflow not found")

    graph_dict = body.model_dump(by_alias=True)

    # Load sub-workflow registry for cross-graph validation
    all_sws = await db.execute(select(SubWorkflow))
    registry: dict[int, dict] = {}
    for other_sw in all_sws.scalars().all():
        if other_sw.id != sub_workflow_id:
            registry[other_sw.id] = {"name": other_sw.name, "graph": other_sw.graph}

    # Validate the sub-workflow graph (cycle detection, unknown types, recursion)
    from app.nodes.graph import CycleDetectedError, SubWorkflowRecursionError

    try:
        manager.validate_sub_workflow_graph(sub_workflow_id, graph_dict, registry=registry)
    except CycleDetectedError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": str(e), "node_id": e.node_id},
        ) from e
    except SubWorkflowRecursionError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": str(e)},
        ) from e

    sw.graph = graph_dict
    await db.commit()

    # Rebuild the main workflow so it picks up updated sub-workflow graphs
    await manager.rebuild_workflow(db)

    await emit_mutate("sub_workflows", "workflow")
    logger.info("Sub-workflow %d graph saved", sub_workflow_id)
    return graph_dict


@router.delete("/{sub_workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sub_workflow(
    sub_workflow_id: int, db: DbSession, _current_user: CurrentUser, manager: HandlerManagerDep
):
    sw = await get_or_404(db, SubWorkflow, sub_workflow_id, detail="Sub-workflow not found")

    # Check if any workflow or other sub-workflow references this one
    refs = await _find_references(db, sub_workflow_id)
    if refs:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Sub-workflow is referenced by: {', '.join(refs)}",
        )

    await db.delete(sw)
    await db.commit()

    await manager.rebuild_workflow(db)

    await emit_mutate("sub_workflows", "workflow")


async def _find_references(db: DbSession, sub_workflow_id: int) -> list[str]:
    """Find all workflows/sub-workflows that reference the given sub-workflow ID."""
    from app.models.settings import Settings

    refs: list[str] = []

    # Check main workflow
    settings_result = await db.execute(select(Settings).limit(1))
    settings = settings_result.scalar_one_or_none()
    if settings and settings.actions_node_map:
        for node in settings.actions_node_map.get("nodes", []):
            if _node_references_sub_workflow(node, sub_workflow_id):
                refs.append("Main Workflow")
                break

    # Check other sub-workflows
    sws_result = await db.execute(select(SubWorkflow).where(SubWorkflow.id != sub_workflow_id))
    for other_sw in sws_result.scalars().all():
        if other_sw.graph:
            for node in other_sw.graph.get("nodes", []):
                if _node_references_sub_workflow(node, sub_workflow_id):
                    refs.append(other_sw.name)
                    break

    return refs


def _node_references_sub_workflow(node: dict, sub_workflow_id: int) -> bool:
    """Check if a node is a SubWorkflowNode referencing the given sub-workflow."""
    node_type = node.get("type", "")
    return node_type == f"sub_workflow_{sub_workflow_id}"
