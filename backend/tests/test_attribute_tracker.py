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
