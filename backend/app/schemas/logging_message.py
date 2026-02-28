import datetime

from pydantic import BaseModel

from app.schemas.common import OrmBase


class LoggingMessageRead(OrmBase, BaseModel):
    id: int
    source: str
    level: int
    message: str
    payload: dict | None = None
    date: datetime.date
    time: datetime.time
