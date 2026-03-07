import datetime
import logging

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select, text

from app.dependencies import CurrentUser, DbSession, HandlerManagerDep
from app.models.attribute import Attribute
from app.schemas.attribute import (
    AttributeCreate,
    AttributeRead,
    AttributeReorderRequest,
    AttributeUpdate,
    AttributeValue,
    OutOfRangeByDateDeleteRequest,
    OutOfRangeByDateItem,
    OutOfRangeByDateRequest,
    OutOfRangeDayItem,
    OutOfRangeDeleteRequest,
    OutOfRangeDeleteResult,
)
from app.socketio_app import sio

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/attributes", tags=["attributes"])


async def _refresh_daily_stats(dates: list[datetime.date], tz_offset: int = 0) -> None:
    """Refresh the daily_stats continuous aggregate for the affected date range."""
    from app.database import engine

    tz_delta = datetime.timedelta(minutes=tz_offset)
    window_start = min(dates)
    window_end = max(dates)
    # Convert to UTC timestamps matching the client timezone, with 1-day buffer on each side
    start = (
        datetime.datetime.combine(window_start - datetime.timedelta(days=1), datetime.time.min, tzinfo=datetime.UTC)
        + tz_delta
    )
    end = (
        datetime.datetime.combine(window_end + datetime.timedelta(days=2), datetime.time.min, tzinfo=datetime.UTC)
        + tz_delta
    )
    try:
        async with engine.connect() as conn:
            await conn.execution_options(isolation_level="AUTOCOMMIT")
            await conn.execute(
                text(
                    f"CALL refresh_continuous_aggregate('daily_stats', "
                    f"'{start.isoformat()}'::timestamptz, '{end.isoformat()}'::timestamptz)"
                )
            )
    except Exception:
        logger.warning("Could not refresh daily_stats continuous aggregate", exc_info=True)


@router.get("/", response_model=list[AttributeRead])
async def list_attributes(db: DbSession, _current_user: CurrentUser, handler_id: int | None = None):
    query = select(Attribute).order_by(Attribute.order.asc().nullslast(), Attribute.id.asc())
    if handler_id is not None:
        query = query.where(Attribute.handler_id == handler_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/values", response_model=list[AttributeValue])
async def all_attribute_values(manager: HandlerManagerDep, _current_user: CurrentUser):
    values = manager.get_current_values()
    daily_stats = manager.get_daily_stats()

    result = []
    seen: set[int] = set()
    for attr_id, data in values.items():
        seen.add(attr_id)
        stats = daily_stats.get(attr_id, {})
        result.append(
            AttributeValue(
                attribute_id=attr_id,
                value=data["value"],
                trend=data["trend"],
                daily_min=stats.get("min"),
                daily_max=stats.get("max"),
                stats_stale=stats.get("stale", False),
                last_changed=data.get("last_changed"),
            )
        )
    # Include attributes that have daily stats but no current value
    for attr_id, stats in daily_stats.items():
        if attr_id not in seen:
            result.append(
                AttributeValue(
                    attribute_id=attr_id,
                    value=None,
                    trend=0,
                    daily_min=stats.get("min"),
                    daily_max=stats.get("max"),
                    stats_stale=stats.get("stale", False),
                )
            )
    return result


@router.put("/reorder", status_code=204)
async def reorder_attributes(body: AttributeReorderRequest, db: DbSession, _current_user: CurrentUser):
    ids = [item.id for item in body.items]
    result = await db.execute(select(Attribute).where(Attribute.id.in_(ids)))
    attrs_by_id = {a.id: a for a in result.scalars()}
    for item in body.items:
        if attr := attrs_by_id.get(item.id):
            attr.order = item.order
    await db.commit()
    await sio.emit("mutate", {"entity": "attributes"})
    await sio.emit("mutate", {"entity": "handlers"})


def _date_range(date: datetime.date, tz_offset: int = 0) -> dict:
    """Return timestamp range params for a single date, adjusted for client timezone.

    tz_offset: browser timezone offset in minutes (JS getTimezoneOffset convention).
    """
    tz_delta = datetime.timedelta(minutes=tz_offset)
    day_start = datetime.datetime.combine(date, datetime.time.min, tzinfo=datetime.UTC) + tz_delta
    return {
        "date_start": day_start,
        "date_end": day_start + datetime.timedelta(days=1),
    }


async def _count_out_of_range_by_date(
    db: DbSession,
    body_attributes: list,
    date: datetime.date,
    db_attributes: dict[int, Attribute],
    tz_offset: int = 0,
) -> list[OutOfRangeByDateItem]:
    """Count out-of-range values per attribute for a single date using caller-supplied bounds."""
    date_params = _date_range(date, tz_offset)
    items = []
    for bounds in body_attributes:
        attr = db_attributes.get(bounds.attribute_id)
        if not attr:
            continue
        if bounds.min_value is None and bounds.max_value is None:
            continue

        range_condition = _build_data_range_condition(bounds.min_value, bounds.max_value)
        count_result = await db.execute(
            text(
                "SELECT count(*) FROM data_units "
                "WHERE attribute_id = :attr_id "
                f"AND timestamp >= :date_start AND timestamp < :date_end AND ({range_condition})"
            ),
            {"attr_id": bounds.attribute_id, **date_params, "min_val": bounds.min_value, "max_val": bounds.max_value},
        )
        count = count_result.scalar()
        if count and count > 0:
            items.append(OutOfRangeByDateItem(attribute_id=attr.id, attribute_name=attr.name, count=count))
    return items


@router.post("/out-of-range-by-date", response_model=list[OutOfRangeByDateItem])
async def check_out_of_range_by_date(body: OutOfRangeByDateRequest, db: DbSession, _current_user: CurrentUser):
    if not body.attributes:
        return []

    ids = [a.attribute_id for a in body.attributes]
    result = await db.execute(select(Attribute).where(Attribute.id.in_(ids)))
    db_attributes = {a.id: a for a in result.scalars()}

    return await _count_out_of_range_by_date(db, body.attributes, body.date, db_attributes, body.tz_offset)


@router.delete("/out-of-range-by-date", response_model=OutOfRangeDeleteResult)
async def delete_out_of_range_by_date(body: OutOfRangeByDateDeleteRequest, db: DbSession, _current_user: CurrentUser):
    if not body.attributes:
        return OutOfRangeDeleteResult(deleted=0)

    ids = [a.attribute_id for a in body.attributes]
    result = await db.execute(select(Attribute).where(Attribute.id.in_(ids)))
    db_attributes = {a.id: a for a in result.scalars()}

    date_params = _date_range(body.date, body.tz_offset)
    total_deleted = 0
    for bounds in body.attributes:
        if bounds.attribute_id not in db_attributes:
            continue
        if bounds.min_value is None and bounds.max_value is None:
            continue

        range_condition = _build_data_range_condition(bounds.min_value, bounds.max_value)
        delete_result = await db.execute(
            text(
                "DELETE FROM data_units "
                "WHERE attribute_id = :attr_id "
                f"AND timestamp >= :date_start AND timestamp < :date_end AND ({range_condition})"
            ),
            {
                "attr_id": bounds.attribute_id,
                **date_params,
                "min_val": bounds.min_value,
                "max_val": bounds.max_value,
            },
        )
        total_deleted += delete_result.rowcount

    await db.commit()
    if total_deleted > 0:
        await _refresh_daily_stats([body.date], body.tz_offset)
    return OutOfRangeDeleteResult(deleted=total_deleted)


@router.get("/{attribute_id}", response_model=AttributeRead)
async def get_attribute(attribute_id: int, db: DbSession, _current_user: CurrentUser):
    result = await db.execute(select(Attribute).where(Attribute.id == attribute_id))
    attribute = result.scalar_one_or_none()
    if not attribute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attribute not found")
    return attribute


@router.get("/{attribute_id}/value", response_model=AttributeValue | None)
async def get_attribute_value(attribute_id: int, manager: HandlerManagerDep, _current_user: CurrentUser):
    val = manager.get_attribute_value(attribute_id)
    if val is None:
        return None
    return AttributeValue(attribute_id=attribute_id, **val)


@router.post("/", response_model=AttributeRead, status_code=status.HTTP_201_CREATED)
async def create_attribute(
    body: AttributeCreate, db: DbSession, manager: HandlerManagerDep, _current_user: CurrentUser
):
    attribute = Attribute(**body.model_dump())
    db.add(attribute)
    await db.commit()
    await db.refresh(attribute)
    await manager.register_attribute(attribute)
    await sio.emit("mutate", {"entity": "attributes"})
    await sio.emit("mutate", {"entity": "handlers"})
    await sio.emit("mutate", {"entity": "widgets"})
    return attribute


@router.delete("/{attribute_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attribute(attribute_id: int, db: DbSession, manager: HandlerManagerDep, _current_user: CurrentUser):
    result = await db.execute(select(Attribute).where(Attribute.id == attribute_id))
    attribute = result.scalar_one_or_none()
    if not attribute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attribute not found")

    await manager.unregister_attribute(attribute.handler_id, attribute.name)
    await db.delete(attribute)
    await db.commit()
    await sio.emit("mutate", {"entity": "attributes"})
    await sio.emit("mutate", {"entity": "handlers"})
    await sio.emit("mutate", {"entity": "widgets"})


@router.patch("/{attribute_id}", response_model=AttributeRead)
async def update_attribute(
    attribute_id: int, body: AttributeUpdate, db: DbSession, manager: HandlerManagerDep, _current_user: CurrentUser
):
    result = await db.execute(select(Attribute).where(Attribute.id == attribute_id))
    attribute = result.scalar_one_or_none()
    if not attribute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attribute not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(attribute, field, value)

    await db.commit()
    await db.refresh(attribute)

    # Sync settings to the in-memory tracker so they take effect immediately
    tracker = manager.get_tracker(attribute_id)
    if tracker is not None:
        tracker.rounding = attribute.rounding
        tracker.min_value = attribute.min_value
        tracker.max_value = attribute.max_value

    await sio.emit("mutate", {"entity": "attributes"})
    await sio.emit("mutate", {"entity": "handlers"})
    await sio.emit("mutate", {"entity": "widgets"})
    return attribute


def _build_data_range_condition(min_value: float | None, max_value: float | None) -> str:
    """Build SQL condition for out-of-range values in data_units."""
    parts = []
    if min_value is not None:
        parts.append("value < :min_val")
    if max_value is not None:
        parts.append("value > :max_val")
    return " OR ".join(parts)


def _build_stats_range_condition(min_value: float | None, max_value: float | None) -> str:
    """Build SQL condition for daily_stats rows that may contain out-of-range values."""
    parts = []
    if min_value is not None:
        parts.append("min_value < :min_val")
    if max_value is not None:
        parts.append("max_value > :max_val")
    return " OR ".join(parts)


@router.get("/{attribute_id}/out-of-range", response_model=list[OutOfRangeDayItem])
async def check_out_of_range(
    attribute_id: int,
    db: DbSession,
    _current_user: CurrentUser,
    tz_offset: int = Query(0, ge=-720, le=840, description="Browser timezone offset in minutes (JS getTimezoneOffset)"),
):
    result = await db.execute(select(Attribute).where(Attribute.id == attribute_id))
    attribute = result.scalar_one_or_none()
    if not attribute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attribute not found")

    if attribute.min_value is None and attribute.max_value is None:
        return []

    # Step 1: Find candidate days from daily_stats aggregate
    stats_condition = _build_stats_range_condition(attribute.min_value, attribute.max_value)
    stats_result = await db.execute(
        text(
            "SELECT bucket::date AS date FROM daily_stats "
            f"WHERE attribute_id = :attr_id AND ({stats_condition}) "
            "ORDER BY date"
        ),
        {"attr_id": attribute_id, "min_val": attribute.min_value, "max_val": attribute.max_value},
    )
    utc_candidate_dates = [row.date for row in stats_result]
    if not utc_candidate_dates:
        return []

    # Expand UTC candidate dates to user-timezone dates: a UTC bucket can span two user-timezone days.
    # East of UTC (tz_offset < 0): UTC day D overlaps user days D and D+1
    # West of UTC (tz_offset > 0): UTC day D overlaps user days D-1 and D
    candidate_dates: set[datetime.date] = set()
    for d in utc_candidate_dates:
        candidate_dates.add(d)
        if tz_offset < 0:
            candidate_dates.add(d + datetime.timedelta(days=1))
        elif tz_offset > 0:
            candidate_dates.add(d - datetime.timedelta(days=1))

    # Step 2: Count exact violations per candidate day (one tight-range query per day for chunk exclusion)
    range_condition = _build_data_range_condition(attribute.min_value, attribute.max_value)
    results = []
    for date in sorted(candidate_dates):
        date_params = _date_range(date, tz_offset)
        count_result = await db.execute(
            text(
                "SELECT count(*) FROM data_units "
                "WHERE attribute_id = :attr_id "
                f"AND timestamp >= :date_start AND timestamp < :date_end AND ({range_condition})"
            ),
            {"attr_id": attribute_id, **date_params, "min_val": attribute.min_value, "max_val": attribute.max_value},
        )
        count = count_result.scalar()
        if count and count > 0:
            results.append(OutOfRangeDayItem(date=date, count=count))
    return results


@router.delete("/{attribute_id}/out-of-range", response_model=OutOfRangeDeleteResult)
async def delete_out_of_range(
    attribute_id: int, body: OutOfRangeDeleteRequest, db: DbSession, _current_user: CurrentUser
):
    result = await db.execute(select(Attribute).where(Attribute.id == attribute_id))
    attribute = result.scalar_one_or_none()
    if not attribute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attribute not found")

    if attribute.min_value is None and attribute.max_value is None:
        return OutOfRangeDeleteResult(deleted=0)

    if not body.dates:
        return OutOfRangeDeleteResult(deleted=0)

    range_condition = _build_data_range_condition(attribute.min_value, attribute.max_value)
    total_deleted = 0
    for date in body.dates:
        date_params = _date_range(date, body.tz_offset)
        delete_result = await db.execute(
            text(
                "DELETE FROM data_units "
                "WHERE attribute_id = :attr_id "
                f"AND timestamp >= :date_start AND timestamp < :date_end AND ({range_condition})"
            ),
            {"attr_id": attribute_id, **date_params, "min_val": attribute.min_value, "max_val": attribute.max_value},
        )
        total_deleted += delete_result.rowcount
    await db.commit()
    if total_deleted > 0:
        await _refresh_daily_stats(body.dates, body.tz_offset)
    return OutOfRangeDeleteResult(deleted=total_deleted)
