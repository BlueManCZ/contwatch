import datetime
from collections import deque
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ProcessResult:
    """Result of processing a new attribute value."""

    data_units: list[dict] = field(default_factory=list)
    type_corrected: bool = False
    stats_reset: bool = False


class AttributeTracker:
    """In-memory tracker for a single registered attribute.

    Implements store-on-change logic: only produces a DataUnit when
    the value actually changes. On change it also emits the previous
    "held" value at the current timestamp for step-function chart shape.

    Also tracks daily min/max statistics in memory (live pushes via Socket.IO).
    The DB-persisted stats are handled by a TimescaleDB continuous aggregate.
    """

    def __init__(self, attribute_id: int, handler_id: int, rounding: int | None = None):
        self.attribute_id = attribute_id
        self.handler_id = handler_id
        self.rounding = rounding
        self._current_value: Any = None
        self._last_changed: datetime.datetime | None = None
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
    def last_changed(self) -> datetime.datetime | None:
        return self._last_changed

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
    def daily_stats(self) -> dict[str, float | None | bool]:
        """Return min/max values only if they are from today."""
        if self._stat_date is not None and self._stat_date != datetime.date.today():
            return {"min": None, "max": None, "stale": True}
        if self._stat_date is None:
            # No today's stats — stale if we have a value (i.e. historical data exists)
            return {"min": None, "max": None, "stale": self._current_value is not None}
        return {"min": self._daily_min, "max": self._daily_max, "stale": False}

    def seed_value(self, value: Any, last_changed: datetime.datetime | None = None) -> None:
        """Seed the current value from the database on startup."""
        self._current_value = value
        self._last_changed = last_changed
        if isinstance(value, (int, float)):
            self._history.append(value)

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

        # Try numeric conversion, then apply rounding
        value = self._try_numeric(raw_value)
        if self.rounding is not None and isinstance(value, (int, float)) and not isinstance(value, bool):
            value = round(value, self.rounding)

        result = ProcessResult()

        if self._current_value is None:
            # First value ever
            result.data_units.append(self._make_unit(value, now))
            self._current_value = value
            self._last_changed = now
            self._last_value_save_skipped = False
        elif value != self._current_value:
            # Value changed — emit held previous value first for step chart.
            # Offset by 1µs so the two points don't collide on the composite PK.
            if self._last_value_save_skipped:
                held_ts = now - datetime.timedelta(microseconds=1)
                result.data_units.append(self._make_unit(self._current_value, held_ts))
            result.data_units.append(self._make_unit(value, now))
            self._current_value = value
            self._last_changed = now
            self._last_value_save_skipped = False
        else:
            # Value unchanged — skip DB write
            self._last_value_save_skipped = True
            # Fix type if seeded from DB (e.g., bool stored as float)
            if isinstance(value, bool) != isinstance(self._current_value, bool):
                self._current_value = value
                result.type_corrected = True

        if isinstance(value, (int, float)):
            self._history.append(value)
            if self._update_daily_stats(value, now.date()):
                result.stats_reset = True

        return result

    def _update_daily_stats(self, value: float, today: datetime.date) -> bool:
        """Compare value against in-memory min/max, reset on date rollover.

        Returns True if stats were reset due to a new day.
        """
        # Date rollover — reset stats
        if self._stat_date != today:
            self._stat_date = today
            self._daily_min = value
            self._daily_max = value
            return True

        # Check for new min
        if self._daily_min is None or value < self._daily_min:
            self._daily_min = value

        # Check for new max
        if self._daily_max is None or value > self._daily_max:
            self._daily_max = value

        return False

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
        if isinstance(value, bool):
            return value  # Preserve boolean type (bool is subclass of int)
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
