import asyncio
import contextlib
import datetime
import logging

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm import selectinload

from app.handlers.base import AbstractHandler
from app.handlers.registry import get_handler_class
from app.models.attribute import Attribute
from app.models.data_unit import DataUnit
from app.models.handler import Handler
from app.models.settings import Settings
from app.nodes.graph import NodeGraph
from app.services.attribute_tracker import AttributeTracker
from app.socketio_app import sio
from app.utils.linearize import linearize

logger = logging.getLogger(__name__)


class HandlerManager:
    """Central orchestrator for all handler instances and attribute trackers."""

    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self._session_factory = session_factory
        self._handlers: dict[int, AbstractHandler] = {}
        self._trackers: dict[int, AttributeTracker] = {}  # attribute_id -> tracker
        self._attr_name_map: dict[int, dict[str, int]] = {}  # handler_id -> {name: attribute_id}
        self._last_messages: dict[int, dict] = {}  # handler_id -> last linearized message
        self._processor_task: asyncio.Task | None = None
        self._workflow_graph: NodeGraph | None = None

    async def startup(self) -> None:
        """Load enabled handlers from DB and start them."""
        async with self._session_factory() as session:
            result = await session.execute(
                select(Handler).where(Handler.enabled.is_(True)).options(selectinload(Handler.attributes))
            )
            handlers = result.scalars().all()

            for db_handler in handlers:
                self._create_handler_instance(db_handler)
                # Register existing attributes
                for attr in db_handler.attributes:
                    if attr.enabled:
                        self._register_tracker(attr.id, db_handler.id, attr.name)

        # Seed daily stats from continuous aggregate
        await self._seed_daily_stats()

        # Start all loaded handlers
        for handler in self._handlers.values():
            handler.start()

        # Start message processor
        self._processor_task = asyncio.create_task(self._message_processor())
        logger.info("HandlerManager started with %d handlers", len(self._handlers))

        # Load saved workflow graph
        async with self._session_factory() as session:
            result = await session.execute(select(Settings).limit(1))
            settings = result.scalar_one_or_none()
            if settings and settings.actions_node_map:
                try:
                    self.rebuild_workflow(settings.actions_node_map)
                except Exception:
                    logger.exception("Failed to load saved workflow graph")

    async def shutdown(self) -> None:
        """Stop all handlers and the message processor."""
        if self._processor_task and not self._processor_task.done():
            self._processor_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._processor_task

        for handler in self._handlers.values():
            await handler.stop()

        logger.info("HandlerManager shut down")

    # --- Message processing ---

    async def _message_processor(self) -> None:
        """Poll all handlers for messages at ~50ms intervals."""
        try:
            while True:
                for handler_id, handler in list(self._handlers.items()):
                    while handler.has_messages():
                        msg = handler.get_message()
                        if msg is not None:
                            await self._process_message(handler_id, msg)
                await asyncio.sleep(0.05)
        except asyncio.CancelledError:
            pass

    async def _process_message(self, handler_id: int, raw_message: dict) -> None:
        """Linearize message and distribute to attribute trackers."""
        flat = linearize(raw_message)
        self._last_messages[handler_id] = flat

        name_map = self._attr_name_map.get(handler_id, {})
        if not name_map:
            return

        async with self._session_factory() as session:
            for attr_name, attr_id in name_map.items():
                if attr_name not in flat:
                    continue

                tracker = self._trackers.get(attr_id)
                if not tracker:
                    continue

                result = tracker.process_value(flat[attr_name])
                for unit_data in result.data_units:
                    session.add(DataUnit(**unit_data))

                if result.data_units:
                    stats = tracker.daily_stats
                    await sio.emit(
                        "attribute_value",
                        {
                            "attribute_id": attr_id,
                            "handler_id": handler_id,
                            "value": tracker.current_value,
                            "trend": tracker.trend,
                            "daily_min": stats["min"],
                            "daily_max": stats["max"],
                        },
                    )
                    await self._execute_attribute_listeners(attr_id)

            await session.commit()

        await self._execute_handler_listeners(handler_id)

    # --- Workflow graph ---

    def rebuild_workflow(self, data: dict) -> None:
        """Build (or rebuild) the workflow execution graph from ReactFlow JSON."""
        self._workflow_graph = NodeGraph(data, manager=self, session_factory=self._session_factory)
        logger.info("Workflow graph rebuilt")

    async def _execute_handler_listeners(self, handler_id: int) -> None:
        if self._workflow_graph:
            try:
                await self._workflow_graph.execute_handler_listeners(handler_id)
            except Exception:
                logger.exception("Error executing workflow handler listeners for handler %d", handler_id)

    async def _execute_attribute_listeners(self, attribute_id: int) -> None:
        if self._workflow_graph:
            try:
                await self._workflow_graph.execute_attribute_listeners(attribute_id)
            except Exception:
                logger.exception("Error executing workflow attribute listeners for attribute %d", attribute_id)

    # --- Handler lifecycle ---

    def _create_handler_instance(self, db_handler: Handler) -> AbstractHandler | None:
        cls = get_handler_class(db_handler.type)
        if not cls:
            logger.warning("Unknown handler type '%s' for handler %d", db_handler.type, db_handler.id)
            return None
        instance = cls(db_handler.id, db_handler.options)
        self._handlers[db_handler.id] = instance
        return instance

    def _register_tracker(self, attribute_id: int, handler_id: int, name: str) -> None:
        self._trackers[attribute_id] = AttributeTracker(attribute_id, handler_id)
        if handler_id not in self._attr_name_map:
            self._attr_name_map[handler_id] = {}
        self._attr_name_map[handler_id][name] = attribute_id

    async def start_handler(self, handler_id: int) -> None:
        """Start a handler by DB id. Creates instance if needed."""
        if handler_id in self._handlers:
            handler = self._handlers[handler_id]
            if handler.is_active:
                return
            handler.start()
        else:
            async with self._session_factory() as session:
                result = await session.execute(
                    select(Handler).where(Handler.id == handler_id).options(selectinload(Handler.attributes))
                )
                db_handler = result.scalar_one_or_none()
                if not db_handler:
                    return
                instance = self._create_handler_instance(db_handler)
                if instance:
                    for attr in db_handler.attributes:
                        if attr.enabled:
                            self._register_tracker(attr.id, db_handler.id, attr.name)
                    instance.start()

        await sio.emit("handler_status", {"handler_id": handler_id, "running": True})
        await sio.emit("mutate", {"entity": "handlers"})

    async def stop_handler(self, handler_id: int) -> None:
        handler = self._handlers.get(handler_id)
        if handler:
            await handler.stop()
            await sio.emit("handler_status", {"handler_id": handler_id, "running": False})
            await sio.emit("mutate", {"entity": "handlers"})

    async def restart_handler(self, handler_id: int) -> None:
        """Restart a running handler to pick up config changes."""
        old = self._handlers.get(handler_id)
        if not old or not old.is_active:
            return
        await old.stop()
        del self._handlers[handler_id]

        async with self._session_factory() as session:
            result = await session.execute(
                select(Handler).where(Handler.id == handler_id).options(selectinload(Handler.attributes))
            )
            db_handler = result.scalar_one_or_none()
            if not db_handler:
                return
            instance = self._create_handler_instance(db_handler)
            if instance:
                instance.start()

        await sio.emit("handler_status", {"handler_id": handler_id, "running": True})
        await sio.emit("mutate", {"entity": "handlers"})

    # --- Action execution ---

    async def execute_action(self, handler_id: int, message: str) -> bool:
        """Route an action to the appropriate handler for execution."""
        handler = self._handlers.get(handler_id)
        if not handler:
            logger.warning("Cannot execute action: handler %d not loaded", handler_id)
            return False
        if not handler.is_active:
            logger.warning("Cannot execute action: handler %d not active", handler_id)
            return False
        return await handler.execute_action(message)

    # --- Daily stats ---

    async def _seed_daily_stats(self) -> None:
        """Load today's stats from the continuous aggregate and seed in-memory trackers."""
        today = datetime.datetime.now(datetime.UTC).date()
        try:
            async with self._session_factory() as session:
                result = await session.execute(
                    text("SELECT attribute_id, min_value, max_value FROM daily_stats WHERE bucket::date = :date"),
                    {"date": today},
                )
                rows = result.mappings().all()
        except Exception:
            # Continuous aggregate may not exist (e.g. tests with SQLite)
            logger.debug("Could not query daily_stats continuous aggregate, skipping seed")
            return

        for row in rows:
            tracker = self._trackers.get(row["attribute_id"])
            if not tracker:
                continue
            tracker.seed_stats(
                date=today,
                min_val=row["min_value"],
                max_val=row["max_value"],
            )

    def get_daily_stats(self) -> dict[int, dict[str, float | None]]:
        """Return daily stats for all tracked attributes {attr_id: {min, max}}."""
        result = {}
        for attr_id, tracker in self._trackers.items():
            stats = tracker.daily_stats
            if stats["min"] is not None or stats["max"] is not None:
                result[attr_id] = stats
        return result

    # --- Status / values ---

    def get_handler_status(self, handler_id: int) -> dict:
        handler = self._handlers.get(handler_id)
        if not handler:
            return {"running": False, "connected": False}
        return {"running": handler.is_active, "connected": handler.is_connected}

    def get_available_attributes(self, handler_id: int) -> list[str]:
        """Return linearized keys from last message that are NOT yet registered."""
        last = self._last_messages.get(handler_id, {})
        registered = set(self._attr_name_map.get(handler_id, {}).keys())
        return sorted(k for k in last if k not in registered)

    def get_current_values(self) -> dict[int, dict]:
        """All tracked attribute values {attr_id: {value, trend}}."""
        result = {}
        for attr_id, tracker in self._trackers.items():
            if tracker.current_value is not None:
                result[attr_id] = {"value": tracker.current_value, "trend": tracker.trend}
        return result

    def get_attribute_value(self, attribute_id: int) -> dict | None:
        tracker = self._trackers.get(attribute_id)
        if not tracker or tracker.current_value is None:
            return None
        return {"value": tracker.current_value, "trend": tracker.trend}

    # --- Attribute registration ---

    async def register_attribute(self, attribute: Attribute) -> None:
        """Register a new attribute for tracking."""
        self._register_tracker(attribute.id, attribute.handler_id, attribute.name)

    async def unregister_attribute(self, handler_id: int, name: str) -> None:
        name_map = self._attr_name_map.get(handler_id, {})
        attr_id = name_map.pop(name, None)
        if attr_id is not None:
            self._trackers.pop(attr_id, None)
