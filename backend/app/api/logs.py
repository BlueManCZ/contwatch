import datetime

from fastapi import APIRouter, Query, status
from sqlalchemy import delete, select

from app.dependencies import CurrentUser, DbSession
from app.models.logging_message import LoggingMessage
from app.schemas.logging_message import LoggingMessageRead
from app.socketio_app import sio

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("/", response_model=list[LoggingMessageRead])
async def list_logs(
    db: DbSession,
    _current_user: CurrentUser,
    level: int | None = Query(None, description="Minimum log level (e.g. 20 for INFO+)"),
    source: str | None = Query(None, description="Exact source match"),
    date_from: datetime.date | None = Query(None, description="Start date (inclusive)"),
    date_to: datetime.date | None = Query(None, description="End date (inclusive)"),
    limit: int = Query(200, ge=1, le=10000),
):
    stmt = select(LoggingMessage)

    if level is not None:
        stmt = stmt.where(LoggingMessage.level >= level)
    if source is not None:
        stmt = stmt.where(LoggingMessage.source == source)
    if date_from is not None:
        start = datetime.datetime.combine(date_from, datetime.time.min, tzinfo=datetime.UTC)
        stmt = stmt.where(LoggingMessage.timestamp >= start)
    if date_to is not None:
        end = datetime.datetime.combine(date_to + datetime.timedelta(days=1), datetime.time.min, tzinfo=datetime.UTC)
        stmt = stmt.where(LoggingMessage.timestamp < end)

    stmt = stmt.order_by(LoggingMessage.timestamp.desc()).limit(limit)

    result = await db.execute(stmt)
    return result.scalars().all()


@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
async def clear_logs(db: DbSession, _current_user: CurrentUser):
    await db.execute(delete(LoggingMessage))
    await db.commit()
    await sio.emit("mutate", {"entity": "logs"})
