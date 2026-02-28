import datetime
from collections import deque
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ProcessResult:
    """Result of processing a new attribute value."""

    data_units: list[dict] = field(default_factory=list)


class AttributeTracker:
    """In-memory tracker for a single registered attribute.

    Implements store-on-change logic: only produces a DataUnit when
    the value actually changes. On change it also emits the previous
    "held" value at the current timestamp for step-function chart shape.

    Also tracks daily min/max statistics in memory (live pushes via Socket.IO).
    The DB-persisted stats are handled by a TimescaleDB continuous aggregate.
    """

    def __init__(self, attribute_id: int, handler_id: int):
        self.attribute_id = attribute_id
        self.handler_id = handler_id
        self._current_value: Any = None
        self._last_value_save_skipped: bool = False
        self._history: deque[float] = deque(maxlen=3)

        # Daily stats (in-memory only, for live Socket.IO pushes)
        self._daily_min: float | None = None
        self._daily_max: float | None = None
        self._stat_date: datetime.date | None = None

    @property
    def current_value(self) -> Any:
        return self._current_value

    @property
    def trend(self) -> int:
        """1 = rising, -1 = falling, 0 = stable / not enough data."""
        if len(self._history) < 2:
            return 0
        vals = list(self._history)
        try:
            if vals[-1] > vals[-2]:
                return 1
            if vals[-1] < vals[-2]:
                return -1
        except TypeError:
            pass
        return 0

    @property
    def daily_stats(self) -> dict[str, float | None]:
        """Return current day's min/max values."""
        today = datetime.datetime.now(datetime.UTC).date()
        if self._stat_date != today:
            return {"min": None, "max": None}
        return {"min": self._daily_min, "max": self._daily_max}

    def seed_stats(
        self,
        date: datetime.date,
        min_val: float,
        max_val: float,
    ) -> None:
        """Seed daily stats from continuous aggregate on startup."""
        self._stat_date = date
        self._daily_min = min_val
        self._daily_max = max_val

    def process_value(self, raw_value: Any) -> ProcessResult:
        """Process a new raw value. Returns ProcessResult with data units."""
        now = datetime.datetime.now(datetime.UTC)

        # Try numeric conversion
        value = self._try_numeric(raw_value)

        result = ProcessResult()

        if self._current_value is None:
            # First value ever
            result.data_units.append(self._make_unit(value, now))
            self._current_value = value
            self._last_value_save_skipped = False
        elif value != self._current_value:
            # Value changed — emit held previous value first for step chart.
            # Offset by 1µs so the two points don't collide on the composite PK.
            if self._last_value_save_skipped:
                held_ts = now - datetime.timedelta(microseconds=1)
                result.data_units.append(self._make_unit(self._current_value, held_ts))
            result.data_units.append(self._make_unit(value, now))
            self._current_value = value
            self._last_value_save_skipped = False
        else:
            # Value unchanged — skip DB write
            self._last_value_save_skipped = True

        if isinstance(value, (int, float)):
            self._history.append(value)
            self._update_daily_stats(value, now.date())

        return result

    def _update_daily_stats(self, value: float, today: datetime.date) -> None:
        """Compare value against in-memory min/max, reset on date rollover."""
        # Date rollover — reset stats
        if self._stat_date != today:
            self._stat_date = today
            self._daily_min = value
            self._daily_max = value
            return

        # Check for new min
        if self._daily_min is None or value < self._daily_min:
            self._daily_min = value

        # Check for new max
        if self._daily_max is None or value > self._daily_max:
            self._daily_max = value

    def _make_unit(self, value: Any, timestamp: datetime.datetime) -> dict:
        numeric = value if isinstance(value, (int, float)) else 0.0
        return {
            "handler_id": self.handler_id,
            "attribute_id": self.attribute_id,
            "value": float(numeric),
            "timestamp": timestamp,
        }

    @staticmethod
    def _try_numeric(value: Any) -> Any:
        if isinstance(value, (int, float)):
            return value
        if isinstance(value, str):
            try:
                return int(value)
            except ValueError:
                try:
                    return float(value)
                except ValueError:
                    pass
        return value
