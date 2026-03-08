import asyncio
import contextlib
import datetime
import json
import logging
from typing import Any

from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm import selectinload

from app.handlers.base import AbstractHandler
from app.handlers.registry import get_handler_class
from app.models.attribute import Attribute
from app.models.data_unit import DataUnit
from app.models.handler import Handler
from app.models.logging_message import LoggingMessage
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
        self._raw_last_changed: dict[int, dict[str, datetime.datetime]] = {}  # handler_id -> {key: timestamp}
        self._last_active: dict[int, datetime.datetime] = {}  # handler_id -> last message time
        self._last_connected_state: dict[int, bool] = {}  # handler_id -> last known connected flag
        self._last_indicators: dict[int, list[dict]] = {}  # handler_id -> last indicators
        self._last_status_emit: dict[int, float] = {}  # handler_id -> monotonic time of last periodic emit
        self._processor_task: asyncio.Task | None = None
        self._workflow_graph: NodeGraph | None = None
        self._action_cache: dict[int, tuple[str, str, int | None]] = {}  # action_id -> (name, message, handler_id)

    async def startup(self) -> None:
        """Load handlers from DB, register trackers, and start enabled ones."""
        async with self._session_factory() as session:
            # Load ALL handlers to register trackers (so we can show last values)
            result = await session.execute(select(Handler).options(selectinload(Handler.attributes)))
            all_handlers = result.scalars().all()

            for db_handler in all_handlers:
                if db_handler.last_active:
                    self._last_active[db_handler.id] = db_handler.last_active
                # Register trackers for all enabled attributes
                for attr in db_handler.attributes:
                    if attr.enabled:
                        self._register_tracker(
                            attr.id,
                            db_handler.id,
                            attr.name,
                            rounding=attr.rounding,
                            min_value=attr.min_value,
                            max_value=attr.max_value,
                        )
                # Only create runtime instances for enabled handlers
                if db_handler.enabled:
                    self._create_handler_instance(db_handler)

        # Seed last known values and daily stats from DB
        await self._seed_last_values()
        await self._seed_daily_stats()

        # Start all loaded handlers
        for handler in self._handlers.values():
            handler.start()

        # Start message processor
        self._processor_task = asyncio.create_task(self._message_processor())
        logger.info("HandlerManager started with %d handlers", len(self._handlers))

        # Load saved workflow graph (with sub-workflows)
        async with self._session_factory() as session:
            await self.rebuild_workflow(session)

    async def shutdown(self) -> None:
        """Stop all handlers and the message processor."""
        if self._processor_task and not self._processor_task.done():
            self._processor_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._processor_task

        for handler in self._handlers.values():
            await handler.stop()

        await self._persist_last_active()
        logger.info("HandlerManager shut down")

    def _status_payload(self, handler_id: int, *, running: bool, connected: bool) -> dict:
        """Build a handler_status event payload including last_active."""
        la = self._last_active.get(handler_id)
        return {
            "handler_id": handler_id,
            "running": running,
            "connected": connected,
            "last_active": la.isoformat() if la else None,
        }

    # --- Message processing ---

    async def _message_processor(self) -> None:
        """Poll all handlers for messages at ~50ms intervals."""
        try:
            while True:
                for handler_id, handler in list(self._handlers.items()):
                    while handler.has_messages():
                        msg = handler.get_message()
                        if msg is not None:
                            try:
                                await self._process_message(handler_id, msg)
                            except Exception:
                                logger.exception("Error processing message for handler %d", handler_id)
                    # Detect connection state changes
                    connected = handler.is_connected
                    prev = self._last_connected_state.get(handler_id)
                    if prev is None or connected != prev:
                        if prev is not None:
                            await sio.emit(
                                "handler_status",
                                self._status_payload(handler_id, running=True, connected=connected),
                            )
                        if not connected:
                            indicators = handler.disconnected_indicators()
                            if indicators:
                                indicator_dicts = [
                                    {
                                        "icon": ind.icon,
                                        "color": ind.color,
                                        "tooltip_key": ind.tooltip_key,
                                        "tooltip_params": ind.tooltip_params,
                                    }
                                    for ind in indicators
                                ]
                                self._last_indicators[handler_id] = indicator_dicts
                                await sio.emit(
                                    "handler_indicators",
                                    {"handler_id": handler_id, "indicators": indicator_dicts},
                                )
                    self._last_connected_state[handler_id] = connected

                # Periodic last_active broadcast for running handlers (~5s)
                now_mono = asyncio.get_event_loop().time()
                for handler_id, handler in list(self._handlers.items()):
                    if not handler.is_active:
                        continue
                    last_emit = self._last_status_emit.get(handler_id, 0.0)
                    if now_mono - last_emit >= 5.0 and handler_id in self._last_active:
                        self._last_status_emit[handler_id] = now_mono
                        await sio.emit(
                            "handler_status",
                            self._status_payload(handler_id, running=True, connected=handler.is_connected),
                        )

                await asyncio.sleep(0.05)
        except asyncio.CancelledError:
            pass

    async def _process_message(self, handler_id: int, raw_message: dict) -> None:
        """Linearize message and distribute to attribute trackers."""
        flat = linearize(raw_message)
        now = datetime.datetime.now(datetime.UTC)
        # Track per-key last-changed timestamps and emit for unregistered keys
        prev = self._last_messages.get(handler_id, {})
        changed_keys: dict[str, datetime.datetime] = {}
        if prev:
            for key, val in flat.items():
                if prev.get(key) != val:
                    changed_keys[key] = now
            if changed_keys:
                self._raw_last_changed.setdefault(handler_id, {}).update(changed_keys)
        self._last_messages[handler_id] = flat
        self._last_active[handler_id] = now

        # Extract and emit status indicators
        handler = self._handlers.get(handler_id)
        if handler:
            indicators = handler.extract_indicators(flat)
            if indicators:
                indicator_dicts = [
                    {
                        "icon": ind.icon,
                        "color": ind.color,
                        "tooltip_key": ind.tooltip_key,
                        "tooltip_params": ind.tooltip_params,
                    }
                    for ind in indicators
                ]
                self._last_indicators[handler_id] = indicator_dicts
                await sio.emit(
                    "handler_indicators",
                    {"handler_id": handler_id, "indicators": indicator_dicts},
                )

        name_map = self._attr_name_map.get(handler_id, {})

        # Emit socket events for all changed raw keys
        for key, ts in changed_keys.items():
            await sio.emit(
                "handler_data_value",
                {
                    "handler_id": handler_id,
                    "key": key,
                    "value": flat[key],
                    "last_changed": ts.isoformat(),
                },
            )
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

                if result.data_units or result.type_corrected or result.stats_reset:
                    stats = tracker.daily_stats
                    last_changed = tracker.last_changed
                    await sio.emit(
                        "attribute_value",
                        {
                            "attribute_id": attr_id,
                            "handler_id": handler_id,
                            "value": tracker.current_value,
                            "trend": tracker.trend,
                            "daily_min": stats["min"],
                            "daily_max": stats["max"],
                            "stats_stale": stats["stale"],
                            "last_changed": last_changed.isoformat() if last_changed else None,
                        },
                    )
                if result.data_units:
                    await self._execute_attribute_listeners(attr_id)

            await session.commit()

        await self._execute_handler_listeners(handler_id)

    # --- Workflow graph ---

    def build_workflow(
        self,
        data: dict,
        sub_workflow_registry: dict[int, dict] | None = None,
    ) -> NodeGraph:
        """Build a workflow graph from ReactFlow JSON without installing it.

        Use this for validation. The returned graph can be installed via
        :meth:`install_workflow`.
        """
        return NodeGraph(
            data,
            manager=self,
            session_factory=self._session_factory,
            sub_workflow_registry=sub_workflow_registry or {},
        )

    def install_workflow(self, graph: NodeGraph) -> None:
        """Install a previously built workflow graph as the active graph."""
        if self._workflow_graph is not None:
            state = self._workflow_graph.collect_node_state()
            if state:
                graph.restore_node_state(state)
        self._workflow_graph = graph
        logger.info("Workflow graph installed")

    async def rebuild_workflow(self, session: AsyncSession) -> None:
        """Reload sub-workflows and main workflow from DB and rebuild the graph."""
        from app.models.sub_workflow import SubWorkflow

        # Load all sub-workflows into registry
        sw_result = await session.execute(select(SubWorkflow))
        registry: dict[int, dict] = {}
        for sw in sw_result.scalars().all():
            registry[sw.id] = {"name": sw.name, "graph": sw.graph}

        # Load main workflow
        result = await session.execute(select(Settings).limit(1))
        settings = result.scalar_one_or_none()
        if settings and settings.actions_node_map:
            try:
                graph = self.build_workflow(settings.actions_node_map, sub_workflow_registry=registry)
                self.install_workflow(graph)
            except Exception:
                logger.exception("Failed to load saved workflow graph")
        else:
            self._workflow_graph = None

    def validate_sub_workflow_graph(
        self,
        sub_workflow_id: int,
        graph_data: dict,
        registry: dict[int, dict] | None = None,
    ) -> None:
        """Validate a sub-workflow graph (cycle detection + recursion check)."""
        from app.nodes.graph import NodeGraph, detect_sub_workflow_recursion

        # Build sub-graph to validate internally (cycles, unknown nodes)
        NodeGraph(
            graph_data,
            manager=self,
            session_factory=self._session_factory,
            sub_workflow_registry=registry or {},
            is_sub_workflow=True,
        )

        # Check for cross-graph recursion: temporarily inject this graph into the registry
        check_registry = dict(registry) if registry else {}
        check_registry[sub_workflow_id] = {"name": "", "graph": graph_data}
        detect_sub_workflow_recursion(check_registry)

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

    def _register_tracker(
        self,
        attribute_id: int,
        handler_id: int,
        name: str,
        rounding: int | None = None,
        min_value: float | None = None,
        max_value: float | None = None,
    ) -> None:
        self._trackers[attribute_id] = AttributeTracker(
            attribute_id, handler_id, rounding=rounding, min_value=min_value, max_value=max_value
        )
        if handler_id not in self._attr_name_map:
            self._attr_name_map[handler_id] = {}
        self._attr_name_map[handler_id][name] = attribute_id

    async def start_handler(self, handler_id: int) -> None:
        """Start a handler by DB id. Recreates instance to pick up config changes."""
        existing = self._handlers.get(handler_id)
        if existing and existing.is_active:
            return

        async with self._session_factory() as session:
            result = await session.execute(
                select(Handler).where(Handler.id == handler_id).options(selectinload(Handler.attributes))
            )
            db_handler = result.scalar_one_or_none()
            if not db_handler:
                return
            instance = self._create_handler_instance(db_handler)
            if instance:
                registered_attr_ids = []
                for attr in db_handler.attributes:
                    if attr.enabled:
                        self._register_tracker(
                            attr.id,
                            db_handler.id,
                            attr.name,
                            rounding=attr.rounding,
                            min_value=attr.min_value,
                            max_value=attr.max_value,
                        )
                        registered_attr_ids.append(attr.id)
                await self._seed_last_values(registered_attr_ids)
                await self._seed_daily_stats(registered_attr_ids)
                instance.start()

        self._last_connected_state[handler_id] = False
        await sio.emit("handler_status", self._status_payload(handler_id, running=True, connected=False))
        await sio.emit("mutate", {"entity": "handlers"})

    async def stop_handler(self, handler_id: int) -> None:
        handler = self._handlers.get(handler_id)
        if handler:
            await handler.stop()
            self._last_connected_state.pop(handler_id, None)
            await sio.emit("handler_status", self._status_payload(handler_id, running=False, connected=False))
            await sio.emit("mutate", {"entity": "handlers"})

    async def remove_handler(self, handler_id: int) -> None:
        """Stop a handler and remove all its in-memory state (trackers, name map, etc.)."""
        await self.stop_handler(handler_id)
        self._handlers.pop(handler_id, None)
        self._last_active.pop(handler_id, None)
        self._last_messages.pop(handler_id, None)
        self._raw_last_changed.pop(handler_id, None)
        self._last_indicators.pop(handler_id, None)
        # Remove trackers for this handler's attributes
        attr_names = self._attr_name_map.pop(handler_id, {})
        for attr_id in attr_names.values():
            self._trackers.pop(attr_id, None)

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

        self._last_connected_state[handler_id] = False
        await sio.emit("handler_status", self._status_payload(handler_id, running=True, connected=False))
        await sio.emit("mutate", {"entity": "handlers"})

    # --- Action execution ---

    async def execute_action(
        self,
        handler_id: int,
        message: str,
        *,
        action_name: str | None = None,
        source: str = "manual",
    ) -> bool:
        """Route an action to the appropriate handler for execution."""
        handler = self._handlers.get(handler_id)
        if not handler:
            logger.warning("Cannot execute action: handler %d not loaded", handler_id)
            return False
        if not handler.is_active:
            logger.warning("Cannot execute action: handler %d not active", handler_id)
            return False
        success = await handler.execute_action(message)
        await self._log_action(action_name or message, handler_id, source, success, message=message)
        return success

    async def execute_action_by_id(
        self,
        handler_id: int,
        action_id: int,
        *,
        source: str = "workflow",
    ) -> bool:
        """Resolve an action by ID (cached) and execute it."""
        cached = self._action_cache.get(action_id)
        if cached:
            name, message, _ = cached
        else:
            async with self._session_factory() as session:
                from app.models.action import Action

                result = await session.execute(select(Action).where(Action.id == action_id))
                action = result.scalar_one_or_none()
                if not action:
                    logger.warning("Cannot execute action: action %d not found", action_id)
                    return False
                name, message = action.name, action.message
                self._action_cache[action_id] = (name, message, action.handler_id)

        return await self.execute_action(handler_id, message, action_name=name, source=source)

    def invalidate_action_cache(self, action_id: int) -> None:
        """Remove a cached action entry (call after action update/delete)."""
        self._action_cache.pop(action_id, None)

    async def _log_action(
        self, action_name: str, handler_id: int, source: str, success: bool, *, message: str | None = None
    ) -> None:
        """Persist an action execution record to the logging_messages table."""
        now = datetime.datetime.now(datetime.UTC)
        level = logging.INFO if success else logging.WARNING
        status = "executed" if success else "failed"
        payload: dict[str, Any] = {
            "handler_id": handler_id,
            "action_name": action_name,
            "source": source,
            "success": success,
        }
        if message is not None:
            try:
                payload["message"] = json.loads(message)
            except (json.JSONDecodeError, TypeError):
                payload["message"] = message
        record = LoggingMessage(
            source="action",
            level=level,
            message=f"{action_name} {status} (handler {handler_id}, {source})",
            payload=payload,
            timestamp=now,
        )
        try:
            async with self._session_factory() as session:
                session.add(record)
                await session.commit()
            await sio.emit("mutate", {"entity": "logs"})
        except Exception:
            logger.debug("Failed to persist action log", exc_info=True)

    # --- Value & stats seeding ---

    async def _seed_last_values(self, attr_ids: list[int] | None = None) -> None:
        """Load the most recent data unit per attribute and seed tracker values."""
        if attr_ids is None:
            if not self._trackers:
                return
            attr_ids = list(self._trackers.keys())
        if not attr_ids:
            return
        try:
            async with self._session_factory() as session:
                result = await session.execute(
                    text(
                        "SELECT DISTINCT ON (attribute_id) attribute_id, value, timestamp "
                        "FROM data_units WHERE attribute_id = ANY(:ids) "
                        "ORDER BY attribute_id, timestamp DESC"
                    ),
                    {"ids": attr_ids},
                )
                rows = result.mappings().all()
        except Exception:
            logger.debug("Could not seed last values from data_units, skipping")
            return

        for row in rows:
            tracker = self._trackers.get(row["attribute_id"])
            if tracker:
                tracker.seed_value(row["value"], row["timestamp"])

    async def _refresh_continuous_aggregate(self) -> None:
        """Refresh the daily_stats continuous aggregate up to now.

        Must run outside a transaction (autocommit) because TimescaleDB
        requires CALL refresh_continuous_aggregate to not be in a tx block.
        """
        from app.database import engine

        try:
            async with engine.connect() as conn:
                await conn.execution_options(isolation_level="AUTOCOMMIT")
                await conn.execute(text("CALL refresh_continuous_aggregate('daily_stats', NULL, NULL)"))
            logger.info("Refreshed daily_stats continuous aggregate")
        except Exception:
            logger.debug("Could not refresh daily_stats continuous aggregate, skipping")

    async def _seed_daily_stats(self, attr_ids: list[int] | None = None) -> None:
        """Refresh the continuous aggregate, then seed today's stats into trackers."""
        if attr_ids is None:
            await self._refresh_continuous_aggregate()
            target_ids = list(self._trackers.keys())
        else:
            target_ids = attr_ids
        if not target_ids:
            return

        today = datetime.datetime.now(datetime.UTC).date()
        try:
            async with self._session_factory() as session:
                result = await session.execute(
                    text(
                        "SELECT attribute_id, min_value, max_value FROM daily_stats "
                        "WHERE bucket::date = :date AND attribute_id = ANY(:ids)"
                    ),
                    {"date": today, "ids": target_ids},
                )
                for row in result.mappings().all():
                    tracker = self._trackers.get(row["attribute_id"])
                    if tracker:
                        tracker.seed_stats(date=today, min_val=row["min_value"], max_val=row["max_value"])
        except Exception:
            # Continuous aggregate may not exist (e.g. tests with SQLite)
            logger.debug("Could not query daily_stats continuous aggregate, skipping seed")

    def get_daily_stats(self) -> dict[int, dict[str, float | None]]:
        """Return daily stats for all tracked attributes {attr_id: {min, max, stale}}."""
        result = {}
        for attr_id, tracker in self._trackers.items():
            stats = tracker.daily_stats
            if stats["min"] is not None or stats["max"] is not None or stats["stale"]:
                result[attr_id] = stats
        return result

    async def _persist_last_active(self) -> None:
        """Flush in-memory last_active timestamps to the database."""
        if not self._last_active:
            return
        async with self._session_factory() as session:
            for handler_id, ts in self._last_active.items():
                await session.execute(update(Handler).where(Handler.id == handler_id).values(last_active=ts))
            await session.commit()

    # --- Status / values ---

    def get_handler_status(self, handler_id: int) -> dict:
        last_active = self._last_active.get(handler_id)
        indicators = self._last_indicators.get(handler_id, [])
        handler = self._handlers.get(handler_id)
        if not handler:
            return {"running": False, "connected": False, "last_active": last_active, "indicators": indicators}
        return {
            "running": handler.is_active,
            "connected": handler.is_connected,
            "last_active": last_active,
            "indicators": indicators,
        }

    def get_all_handler_statuses(self) -> dict[int, dict]:
        """Return running/connected status for every known handler."""
        all_ids = set(self._handlers) | set(self._last_active) | set(self._attr_name_map)
        return {hid: self.get_handler_status(hid) for hid in sorted(all_ids)}

    def get_available_attributes(self, handler_id: int) -> list[dict[str, Any]]:
        """Return available attributes with current values and known metadata.

        Combines linearized keys from the last received message with
        known attribute names defined on the handler class, so that
        known attributes are available even before the first message.
        """
        last = self._last_messages.get(handler_id, {})
        registered = set(self._attr_name_map.get(handler_id, {}).keys())
        available = set(last.keys())

        # Build lookup from known attributes
        ka_map: dict[str, tuple[str | None, str | None]] = {}
        handler = self._handlers.get(handler_id)
        if handler:
            for ka in handler.known_attributes:
                available.add(ka.name)
                ka_map[ka.name] = (ka.label, ka.unit)

        result: list[dict[str, Any]] = []
        for name in sorted(available):
            if name in registered:
                continue
            label, unit = ka_map.get(name, (None, None))
            result.append({"name": name, "value": last.get(name), "label": label, "unit": unit})
        return result

    def get_current_values(self) -> dict[int, dict]:
        """All tracked attribute values {attr_id: {value, trend}}."""
        result = {}
        for attr_id, tracker in self._trackers.items():
            if tracker.current_value is not None:
                last_changed = tracker.last_changed
                result[attr_id] = {
                    "value": tracker.current_value,
                    "trend": tracker.trend,
                    "last_changed": last_changed.isoformat() if last_changed else None,
                }
        return result

    def get_last_message(self, handler_id: int) -> dict:
        """Return the last linearized raw message for a handler."""
        return self._last_messages.get(handler_id, {})

    def get_handler_data_value(self, handler_id: int, key: str) -> dict:
        """Read a raw value + last_changed from a handler's last linearized message."""
        value = self._last_messages.get(handler_id, {}).get(key)
        last_changed = self._raw_last_changed.get(handler_id, {}).get(key)
        return {"value": value, "last_changed": last_changed}

    def get_all_data_keys(self, attribute_labels: dict[tuple[int, str], str] | None = None) -> list[dict]:
        """Return linearized keys as structured dicts with value, label, group, and display_label."""
        labels = attribute_labels or {}
        keys: list[dict] = []
        for handler_id, flat in sorted(self._last_messages.items()):
            for key in sorted(flat):
                display = labels.get((handler_id, key), "")
                keys.append({"value": key, "label": key, "group": str(handler_id), "display_label": display})
        return keys

    def get_attribute_value(self, attribute_id: int) -> dict | None:
        tracker = self._trackers.get(attribute_id)
        if not tracker or tracker.current_value is None:
            return None
        return {"value": tracker.current_value, "trend": tracker.trend}

    # --- Attribute registration ---

    def get_tracker(self, attribute_id: int) -> AttributeTracker | None:
        """Return the in-memory tracker for an attribute, if it exists."""
        return self._trackers.get(attribute_id)

    async def register_attribute(self, attribute: Attribute) -> None:
        """Register a new attribute for tracking."""
        self._register_tracker(
            attribute.id,
            attribute.handler_id,
            attribute.name,
            rounding=attribute.rounding,
            min_value=attribute.min_value,
            max_value=attribute.max_value,
        )

    async def unregister_attribute(self, handler_id: int, name: str) -> None:
        name_map = self._attr_name_map.get(handler_id, {})
        attr_id = name_map.pop(name, None)
        if attr_id is not None:
            self._trackers.pop(attr_id, None)
