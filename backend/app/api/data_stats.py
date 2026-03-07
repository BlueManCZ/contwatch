import datetime

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import text

from app.dependencies import CurrentUser, DbSession
from app.schemas.data_stat import DailyStatRead

router = APIRouter(prefix="/data-stats", tags=["data-stats"])


@router.get("/", response_model=list[DailyStatRead])
async def list_data_stats(
    db: DbSession,
    _current_user: CurrentUser,
    attribute_ids: str = Query(..., description="Comma-separated attribute IDs"),
    date: datetime.date | None = None,
    date_from: datetime.date | None = None,
    date_to: datetime.date | None = None,
):
    ids = [int(x) for x in attribute_ids.split(",") if x.strip()]
    if len(ids) > 100:
        raise HTTPException(status_code=400, detail="Too many attribute IDs (max 100)")

    if date_from and date_to:
        # Date range query
        result = await db.execute(
            text(
                "SELECT attribute_id, bucket::date AS date, min_value, max_value "
                "FROM daily_stats "
                "WHERE attribute_id = ANY(:ids) AND bucket::date >= :date_from AND bucket::date <= :date_to "
                "ORDER BY bucket::date"
            ),
            {"ids": ids, "date_from": date_from, "date_to": date_to},
        )
    else:
        # Single date query (backwards compatible)
        if date is None:
            date = datetime.datetime.now(datetime.UTC).date()
        result = await db.execute(
            text(
                "SELECT attribute_id, bucket::date AS date, min_value, max_value "
                "FROM daily_stats "
                "WHERE attribute_id = ANY(:ids) AND bucket::date = :date"
            ),
            {"ids": ids, "date": date},
        )

    rows = result.mappings().all()
    return [DailyStatRead(**row) for row in rows]
