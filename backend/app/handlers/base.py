import asyncio
import contextlib
import logging
from dataclasses import dataclass
from typing import Any, ClassVar

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class KnownAttribute:
    name: str
    label: str | None = None
    unit: str | None = None
    icon: str | None = None
    rounding: int | None = None


@dataclass(frozen=True)
class KnownAction:
    name: str
    message: str


class AbstractHandler:
    """Base class for all IoT data handlers.

    Subclasses must set class-level attributes (handler_type, handler_name, etc.)
    and implement the async run() method.
    """

    handler_type: ClassVar[str] = ""
    handler_name: ClassVar[str] = "Unknown"
    handler_icon: ClassVar[str] = "default"
    handler_category: ClassVar[str] = ""
    config_fields: ClassVar[list[dict]] = []
    known_attributes: ClassVar[list[KnownAttribute]] = []
    known_actions: ClassVar[list[KnownAction]] = []
    probe_priority: ClassVar[int] = 0

    @classmethod
    def describe(cls, options: dict) -> str:
        """Return a short human-readable description for a handler instance."""
        return cls.handler_name

    @classmethod
    async def probe(cls, config: dict) -> bool:
        """Attempt to detect this handler type from the given config. Returns True if detected."""
        return False

    def __init__(self, handler_id: int, options: dict):
        self.handler_id = handler_id
        self.options = options or {}
        self._task: asyncio.Task | None = None
        self._active = False
        self._connected = False
        self._queue: asyncio.Queue[dict] = asyncio.Queue()

    # --- Lifecycle ---

    def start(self) -> None:
        if self._task and not self._task.done():
            return
        self._active = True
        self._task = asyncio.create_task(self._run_wrapper())
        logger.info("Handler %s (%s) started", self.handler_id, self.handler_type)

    async def stop(self) -> None:
        self._active = False
        if self._task and not self._task.done():
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
        self._task = None
        self._connected = False
        logger.info("Handler %s (%s) stopped", self.handler_id, self.handler_type)

    async def _run_wrapper(self) -> None:
        try:
            await self.run()
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Handler %s (%s) crashed", self.handler_id, self.handler_type)
        finally:
            self._active = False
            self._connected = False

    async def run(self) -> None:
        raise NotImplementedError

    # --- State ---

    @property
    def is_active(self) -> bool:
        return self._active

    @property
    def is_connected(self) -> bool:
        return self._connected

    # --- Message queue ---

    def add_message(self, message: dict) -> None:
        self._queue.put_nowait(message)

    def has_messages(self) -> bool:
        return not self._queue.empty()

    def get_message(self) -> dict | None:
        try:
            return self._queue.get_nowait()
        except asyncio.QueueEmpty:
            return None

    # --- Action execution ---

    async def execute_action(self, message: str) -> bool:
        """Execute an action. message is a JSON string. Returns success."""
        raise NotImplementedError

    # --- Config helpers ---

    def get_config(self) -> dict:
        return self.options.get("config", {})

    def get_config_option(self, key: str, default: Any = None) -> Any:
        return self.get_config().get(key, default)

    # --- Interval helper ---

    async def wait_for_interval(self, seconds: float) -> None:
        """Sleep for the given interval, checking every 0.5s for cancellation."""
        elapsed = 0.0
        while self._active and elapsed < seconds:
            await asyncio.sleep(min(0.5, seconds - elapsed))
            elapsed += 0.5
