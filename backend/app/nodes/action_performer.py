import logging

from sqlalchemy import select

from app.models.action import Action
from app.nodes.base import AbstractNode
from app.nodes.ports import action_handler_port, action_port, event_port

logger = logging.getLogger(__name__)


class ActionPerformer(AbstractNode):
    label = "Action Performer"
    description = "Executes an action on a handler"
    input_ports = (event_port(), action_handler_port(), action_port())
    output_ports = ()

    async def execute(self) -> None:
        handler_id = self.get_input("handler_id")
        action_id = self.get_input("action_id")

        if handler_id is None or action_id is None:
            logger.warning("[Workflow] ActionPerformer %s: missing handler_id or action_id", self.node_id)
            return

        if not self.manager or not self.session_factory:
            logger.warning("[Workflow] ActionPerformer %s: no manager or session_factory", self.node_id)
            return

        async with self.session_factory() as session:
            result = await session.execute(select(Action).where(Action.id == int(action_id)))
            action = result.scalar_one_or_none()
            if not action:
                logger.warning("[Workflow] ActionPerformer %s: action %s not found", self.node_id, action_id)
                return

        success = await self.manager.execute_action(
            int(handler_id), action.message, action_name=action.name, source="workflow"
        )
        if success:
            logger.info(
                "[Workflow] ActionPerformer %s: executed action '%s' on handler %s",
                self.node_id,
                action.name,
                handler_id,
            )
        else:
            logger.warning(
                "[Workflow] ActionPerformer %s: failed to execute action '%s' on handler %s",
                self.node_id,
                action.name,
                handler_id,
            )
