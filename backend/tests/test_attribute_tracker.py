import datetime

from app.services.attribute_tracker import AttributeTracker


class TestMinMaxBounds:
    """Test that AttributeTracker rejects values outside configured bounds."""

    def test_value_below_min_rejected(self):
        tracker = AttributeTracker(1, 1, min_value=-10.0)
        result = tracker.process_value(-20.0)
        assert result.data_units == []

    def test_value_above_max_rejected(self):
        tracker = AttributeTracker(1, 1, max_value=50.0)
        result = tracker.process_value(100.0)
        assert result.data_units == []

    def test_value_within_bounds_accepted(self):
        tracker = AttributeTracker(1, 1, min_value=-10.0, max_value=50.0)
        result = tracker.process_value(25.0)
        assert len(result.data_units) == 1
        assert result.data_units[0]["value"] == 25.0

    def test_value_at_min_accepted(self):
        tracker = AttributeTracker(1, 1, min_value=0.0)
        result = tracker.process_value(0.0)
        assert len(result.data_units) == 1

    def test_value_at_max_accepted(self):
        tracker = AttributeTracker(1, 1, max_value=100.0)
        result = tracker.process_value(100.0)
        assert len(result.data_units) == 1

    def test_only_min_set(self):
        tracker = AttributeTracker(1, 1, min_value=0.0)
        assert tracker.process_value(50.0).data_units  # accepted
        assert not tracker.process_value(-1.0).data_units  # rejected (first value was stored, -1 is below min)

    def test_only_max_set(self):
        tracker = AttributeTracker(1, 1, max_value=100.0)
        assert tracker.process_value(50.0).data_units  # accepted
        assert not tracker.process_value(101.0).data_units  # rejected

    def test_no_bounds_accepts_everything(self):
        tracker = AttributeTracker(1, 1)
        result = tracker.process_value(99999.0)
        assert len(result.data_units) == 1

    def test_boolean_not_filtered_by_bounds(self):
        tracker = AttributeTracker(1, 1, min_value=0.0, max_value=1.0)
        result = tracker.process_value(True)
        assert len(result.data_units) == 1

    def test_string_not_filtered_by_bounds(self):
        tracker = AttributeTracker(1, 1, min_value=0.0, max_value=100.0)
        result = tracker.process_value("hello")
        assert len(result.data_units) == 1

    def test_rejected_value_does_not_update_state(self):
        tracker = AttributeTracker(1, 1, min_value=0.0, max_value=100.0)
        tracker.process_value(50.0)
        assert tracker.current_value == 50.0

        tracker.process_value(200.0)  # rejected
        assert tracker.current_value == 50.0  # unchanged

    def test_bounds_can_be_updated_at_runtime(self):
        tracker = AttributeTracker(1, 1, max_value=100.0)
        assert not tracker.process_value(150.0).data_units  # rejected

        tracker.max_value = 200.0
        # Need a different value since 150 was never stored
        assert tracker.process_value(150.0).data_units  # now accepted

    def test_numeric_string_filtered_by_bounds(self):
        tracker = AttributeTracker(1, 1, max_value=50.0)
        result = tracker.process_value("100")
        assert result.data_units == []


class TestStoreOnChange:
    """Test that only changed values produce data units."""

    def test_first_value_always_stored(self):
        tracker = AttributeTracker(1, 1)
        result = tracker.process_value(10.0)
        assert len(result.data_units) == 1

    def test_same_value_skipped(self):
        tracker = AttributeTracker(1, 1)
        tracker.process_value(10.0)
        result = tracker.process_value(10.0)
        assert result.data_units == []

    def test_different_value_stored(self):
        tracker = AttributeTracker(1, 1)
        tracker.process_value(10.0)
        result = tracker.process_value(20.0)
        assert len(result.data_units) == 1
        assert result.data_units[0]["value"] == 20.0

    def test_current_value_updated_on_change(self):
        tracker = AttributeTracker(1, 1)
        tracker.process_value(10.0)
        tracker.process_value(20.0)
        assert tracker.current_value == 20.0

    def test_current_value_unchanged_on_skip(self):
        tracker = AttributeTracker(1, 1)
        tracker.process_value(10.0)
        tracker.process_value(10.0)
        assert tracker.current_value == 10.0

    def test_last_changed_set_on_first_value(self):
        tracker = AttributeTracker(1, 1)
        tracker.process_value(10.0)
        assert tracker.last_changed is not None

    def test_last_changed_updated_on_change(self):
        tracker = AttributeTracker(1, 1)
        tracker.process_value(10.0)
        first_changed = tracker.last_changed
        tracker.process_value(10.0)  # skip
        assert tracker.last_changed == first_changed  # unchanged
        tracker.process_value(20.0)  # change
        assert tracker.last_changed > first_changed

    def test_string_store_on_change(self):
        tracker = AttributeTracker(1, 1)
        tracker.process_value("hello")
        result = tracker.process_value("hello")
        assert result.data_units == []
        result = tracker.process_value("world")
        # 2 units: held "hello" at now-1µs + new "world"
        assert len(result.data_units) == 2


class TestStepChartHeldValue:
    """Test that a held previous value is emitted at now-1µs before a change."""

    def test_no_held_value_on_first_change(self):
        tracker = AttributeTracker(1, 1)
        tracker.process_value(10.0)
        # Change immediately — no skip happened, so no held value
        result = tracker.process_value(20.0)
        assert len(result.data_units) == 1
        assert result.data_units[0]["value"] == 20.0

    def test_held_value_after_skip(self):
        tracker = AttributeTracker(1, 1)
        tracker.process_value(10.0)
        tracker.process_value(10.0)  # skip — sets _last_value_save_skipped
        result = tracker.process_value(20.0)  # change
        assert len(result.data_units) == 2
        # First unit is the held previous value
        assert result.data_units[0]["value"] == 10.0
        # Second unit is the new value
        assert result.data_units[1]["value"] == 20.0

    def test_held_value_timestamp_offset(self):
        tracker = AttributeTracker(1, 1)
        tracker.process_value(10.0)
        tracker.process_value(10.0)  # skip
        result = tracker.process_value(20.0)
        held_ts = result.data_units[0]["timestamp"]
        new_ts = result.data_units[1]["timestamp"]
        assert new_ts - held_ts == datetime.timedelta(microseconds=1)

    def test_no_held_value_on_consecutive_changes(self):
        tracker = AttributeTracker(1, 1)
        tracker.process_value(10.0)
        tracker.process_value(20.0)  # change, no skip before
        result = tracker.process_value(30.0)  # change again, no skip before
        assert len(result.data_units) == 1

    def test_multiple_skips_then_change(self):
        tracker = AttributeTracker(1, 1)
        tracker.process_value(10.0)
        tracker.process_value(10.0)  # skip
        tracker.process_value(10.0)  # skip
        tracker.process_value(10.0)  # skip
        result = tracker.process_value(20.0)
        assert len(result.data_units) == 2
        assert result.data_units[0]["value"] == 10.0
        assert result.data_units[1]["value"] == 20.0


class TestTrend:
    """Test trend calculation from history deque."""

    def test_no_history(self):
        tracker = AttributeTracker(1, 1)
        assert tracker.trend == 0

    def test_single_value(self):
        tracker = AttributeTracker(1, 1)
        tracker.process_value(10.0)
        assert tracker.trend == 0

    def test_rising(self):
        tracker = AttributeTracker(1, 1)
        tracker.process_value(10.0)
        tracker.process_value(20.0)
        assert tracker.trend == 1

    def test_falling(self):
        tracker = AttributeTracker(1, 1)
        tracker.process_value(20.0)
        tracker.process_value(10.0)
        assert tracker.trend == -1

    def test_stable(self):
        tracker = AttributeTracker(1, 1)
        tracker.process_value(10.0)
        tracker.process_value(10.0)  # skipped by store-on-change but still added to history
        assert tracker.trend == 0

    def test_trend_uses_last_two(self):
        tracker = AttributeTracker(1, 1)
        tracker.process_value(10.0)
        tracker.process_value(20.0)
        tracker.process_value(15.0)
        assert tracker.trend == -1  # 20 -> 15

    def test_non_numeric_no_history(self):
        tracker = AttributeTracker(1, 1)
        tracker.process_value("hello")
        tracker.process_value("world")
        assert tracker.trend == 0  # strings not added to history

    def test_boolean_added_to_history(self):
        # bool is subclass of int, but bounds skip it — history still tracks it
        tracker = AttributeTracker(1, 1)
        tracker.process_value(False)
        tracker.process_value(True)
        assert tracker.trend == 1  # False(0) -> True(1)


class TestDailyStats:
    """Test daily min/max tracking and date rollover."""

    def test_first_value_sets_stats(self):
        tracker = AttributeTracker(1, 1)
        tracker.process_value(25.0)
        stats = tracker.daily_stats
        assert stats["min"] == 25.0
        assert stats["max"] == 25.0
        assert stats["stale"] is False

    def test_min_max_update(self):
        tracker = AttributeTracker(1, 1)
        tracker.process_value(25.0)
        tracker.process_value(10.0)
        tracker.process_value(40.0)
        stats = tracker.daily_stats
        assert stats["min"] == 10.0
        assert stats["max"] == 40.0

    def test_same_value_does_not_break_stats(self):
        tracker = AttributeTracker(1, 1)
        tracker.process_value(25.0)
        tracker.process_value(25.0)  # skipped by store-on-change but stats still track
        stats = tracker.daily_stats
        assert stats["min"] == 25.0
        assert stats["max"] == 25.0

    def test_stats_reset_flag_on_date_rollover(self):
        tracker = AttributeTracker(1, 1)
        result = tracker.process_value(25.0)
        assert result.stats_reset is True  # first value always resets (no previous date)

        result = tracker.process_value(30.0)
        assert result.stats_reset is False  # same day

    def test_no_stats_without_value(self):
        tracker = AttributeTracker(1, 1)
        stats = tracker.daily_stats
        assert stats["min"] is None
        assert stats["max"] is None
        assert stats["stale"] is False  # no current value, so not stale

    def test_stale_when_has_value_but_no_stats(self):
        tracker = AttributeTracker(1, 1)
        tracker.seed_value(42.0)  # has a value but no stats date
        stats = tracker.daily_stats
        assert stats["stale"] is True

    def test_string_values_dont_update_stats(self):
        tracker = AttributeTracker(1, 1)
        tracker.process_value("hello")
        stats = tracker.daily_stats
        assert stats["min"] is None
        assert stats["max"] is None


class TestSeedValue:
    """Test seeding tracker state from database on startup."""

    def test_seed_sets_current_value(self):
        tracker = AttributeTracker(1, 1)
        tracker.seed_value(42.0)
        assert tracker.current_value == 42.0

    def test_seed_sets_last_changed(self):
        tracker = AttributeTracker(1, 1)
        ts = datetime.datetime(2026, 1, 1, tzinfo=datetime.UTC)
        tracker.seed_value(42.0, last_changed=ts)
        assert tracker.last_changed == ts

    def test_seed_adds_to_history(self):
        tracker = AttributeTracker(1, 1)
        tracker.seed_value(10.0)
        tracker.seed_value(20.0)  # second seed (shouldn't happen but tests history)
        assert tracker.trend == 1

    def test_seed_non_numeric_no_history(self):
        tracker = AttributeTracker(1, 1)
        tracker.seed_value("hello")
        assert tracker.current_value == "hello"
        assert tracker.trend == 0

    def test_seed_then_process_change(self):
        tracker = AttributeTracker(1, 1)
        tracker.seed_value(10.0)
        result = tracker.process_value(20.0)
        assert len(result.data_units) == 1
        assert result.data_units[0]["value"] == 20.0

    def test_seed_then_process_same(self):
        tracker = AttributeTracker(1, 1)
        tracker.seed_value(10.0)
        result = tracker.process_value(10.0)
        assert result.data_units == []


class TestSeedStats:
    """Test seeding daily stats from continuous aggregate."""

    def test_seed_stats_sets_values(self):
        tracker = AttributeTracker(1, 1)
        today = datetime.date.today()
        tracker.seed_stats(today, min_val=5.0, max_val=50.0)
        stats = tracker.daily_stats
        assert stats["min"] == 5.0
        assert stats["max"] == 50.0
        assert stats["stale"] is False

    def test_seed_stats_stale_if_old_date(self):
        tracker = AttributeTracker(1, 1)
        old_date = datetime.date(2020, 1, 1)
        tracker.seed_stats(old_date, min_val=5.0, max_val=50.0)
        stats = tracker.daily_stats
        assert stats["min"] is None
        assert stats["max"] is None
        assert stats["stale"] is True

    def test_process_value_updates_seeded_stats(self):
        tracker = AttributeTracker(1, 1)
        today = datetime.date.today()
        tracker.seed_stats(today, min_val=10.0, max_val=20.0)
        tracker.process_value(5.0)  # new min
        stats = tracker.daily_stats
        assert stats["min"] == 5.0
        assert stats["max"] == 20.0

    def test_process_value_updates_seeded_max(self):
        tracker = AttributeTracker(1, 1)
        today = datetime.date.today()
        tracker.seed_stats(today, min_val=10.0, max_val=20.0)
        tracker.process_value(30.0)  # new max
        stats = tracker.daily_stats
        assert stats["min"] == 10.0
        assert stats["max"] == 30.0


class TestTypeCorrection:
    """Test type mismatch correction (e.g., bool stored as float in DB)."""

    def test_type_corrected_flag(self):
        tracker = AttributeTracker(1, 1)
        tracker.seed_value(1.0)  # seeded as float from DB
        result = tracker.process_value(True)  # actual value is bool True (== 1.0)
        assert result.type_corrected is True
        assert result.data_units == []  # no DB write needed
        assert tracker.current_value is True  # corrected to bool

    def test_no_correction_same_type(self):
        tracker = AttributeTracker(1, 1)
        tracker.process_value(10.0)
        result = tracker.process_value(10.0)
        assert result.type_corrected is False

    def test_float_to_bool_correction(self):
        tracker = AttributeTracker(1, 1)
        tracker.seed_value(0.0)
        result = tracker.process_value(False)  # False == 0.0 but different type
        assert result.type_corrected is True
        assert tracker.current_value is False


class TestRounding:
    """Test value rounding before store-on-change comparison."""

    def test_rounding_applied(self):
        tracker = AttributeTracker(1, 1, rounding=1)
        result = tracker.process_value(10.15)
        assert result.data_units[0]["value"] == 10.2

    def test_rounding_prevents_unnecessary_change(self):
        tracker = AttributeTracker(1, 1, rounding=0)
        tracker.process_value(10.4)  # rounds to 10.0
        result = tracker.process_value(10.3)  # also rounds to 10.0
        assert result.data_units == []

    def test_rounding_zero_decimals(self):
        tracker = AttributeTracker(1, 1, rounding=0)
        result = tracker.process_value(10.7)
        assert result.data_units[0]["value"] == 11.0

    def test_no_rounding_when_none(self):
        tracker = AttributeTracker(1, 1, rounding=None)
        result = tracker.process_value(10.123456789)
        assert result.data_units[0]["value"] == 10.123456789

    def test_rounding_not_applied_to_bool(self):
        tracker = AttributeTracker(1, 1, rounding=0)
        result = tracker.process_value(True)
        assert tracker.current_value is True  # not rounded to 1.0

    def test_rounding_not_applied_to_string(self):
        tracker = AttributeTracker(1, 1, rounding=0)
        result = tracker.process_value("hello")
        assert tracker.current_value == "hello"


class TestTryNumeric:
    """Test string-to-number conversion."""

    def test_int_passthrough(self):
        assert AttributeTracker._try_numeric(42) == 42

    def test_float_passthrough(self):
        assert AttributeTracker._try_numeric(3.14) == 3.14

    def test_bool_preserved(self):
        assert AttributeTracker._try_numeric(True) is True
        assert AttributeTracker._try_numeric(False) is False

    def test_string_to_int(self):
        assert AttributeTracker._try_numeric("42") == 42
        assert isinstance(AttributeTracker._try_numeric("42"), int)

    def test_string_to_float(self):
        assert AttributeTracker._try_numeric("3.14") == 3.14
        assert isinstance(AttributeTracker._try_numeric("3.14"), float)

    def test_non_numeric_string_passthrough(self):
        assert AttributeTracker._try_numeric("hello") == "hello"

    def test_none_passthrough(self):
        assert AttributeTracker._try_numeric(None) is None

    def test_empty_string_passthrough(self):
        assert AttributeTracker._try_numeric("") == ""


class TestMakeUnit:
    """Test data unit dict structure."""

    def test_numeric_value(self):
        tracker = AttributeTracker(attribute_id=5, handler_id=3)
        result = tracker.process_value(42.0)
        unit = result.data_units[0]
        assert unit["handler_id"] == 3
        assert unit["attribute_id"] == 5
        assert unit["value"] == 42.0
        assert isinstance(unit["timestamp"], datetime.datetime)

    def test_non_numeric_stored_as_zero(self):
        tracker = AttributeTracker(1, 1)
        result = tracker.process_value("hello")
        assert result.data_units[0]["value"] == 0.0

    def test_bool_stored_as_float(self):
        tracker = AttributeTracker(1, 1)
        result = tracker.process_value(True)
        assert result.data_units[0]["value"] == 1.0
