import datetime

from sqlalchemy import Date, Integer, String, Time
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, JsonType


class LoggingMessage(Base):
    __tablename__ = "logging_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source: Mapped[str] = mapped_column(String(150))
    level: Mapped[int] = mapped_column(Integer)
    message: Mapped[str] = mapped_column(String(1000))
    payload: Mapped[dict | None] = mapped_column(JsonType, nullable=True)
    date: Mapped[datetime.date] = mapped_column(Date, index=True)
    time: Mapped[datetime.time] = mapped_column(Time)
