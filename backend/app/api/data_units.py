import datetime

from fastapi import APIRouter, Query
from sqlalchemy import select

from app.dependencies import CurrentUser, DbSession
from app.models.attribute import Attribute
from app.models.data_unit import DataUnit
from app.schemas.data_unit import ChartDataPoint, ChartDataset, DataUnitRead

router = APIRouter(prefix="/data-units", tags=["data-units"])


@router.get("/", response_model=list[DataUnitRead])
async def list_data_units(
    db: DbSession,
    _current_user: CurrentUser,
    attribute_id: int | None = None,
    date_from: datetime.date | None = None,
    date_to: datetime.date | None = None,
    limit: int = 1000,
):
    query = select(DataUnit)
    if attribute_id is not None:
        query = query.where(DataUnit.attribute_id == attribute_id)
    if date_from is not None:
        start = datetime.datetime.combine(date_from, datetime.time.min, tzinfo=datetime.UTC)
        query = query.where(DataUnit.timestamp >= start)
    if date_to is not None:
        end = datetime.datetime.combine(date_to + datetime.timedelta(days=1), datetime.time.min, tzinfo=datetime.UTC)
        query = query.where(DataUnit.timestamp < end)
    query = query.order_by(DataUnit.timestamp.desc()).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/chart", response_model=list[ChartDataset])
async def chart_data(
    db: DbSession,
    _current_user: CurrentUser,
    attribute_ids: str = Query(..., description="Comma-separated attribute IDs"),
    date: datetime.date | None = None,
):
    if date is None:
        date = datetime.datetime.now(datetime.UTC).date()

    ids = [int(x) for x in attribute_ids.split(",") if x.strip()]

    # Day boundaries in UTC
    day_start = datetime.datetime.combine(date, datetime.time.min, tzinfo=datetime.UTC)
    day_end = day_start + datetime.timedelta(days=1)

    # Load attributes metadata
    attr_result = await db.execute(select(Attribute).where(Attribute.id.in_(ids)))
    attrs_by_id = {a.id: a for a in attr_result.scalars().all()}

    datasets: list[ChartDataset] = []
    for attr_id in ids:
        attr = attrs_by_id.get(attr_id)
        if attr is None:
            continue

        result = await db.execute(
            select(DataUnit)
            .where(
                DataUnit.attribute_id == attr_id,
                DataUnit.timestamp >= day_start,
                DataUnit.timestamp < day_end,
            )
            .order_by(DataUnit.timestamp.asc())
        )
        units = result.scalars().all()

        points = [
            ChartDataPoint(
                x=int(du.timestamp.timestamp() * 1000),
                y=du.value,
            )
            for du in units
        ]

        datasets.append(
            ChartDataset(
                id=attr.id,
                label=attr.label or attr.name,
                unit=attr.unit,
                color=attr.color,
                data=points,
            )
        )

    return datasets
