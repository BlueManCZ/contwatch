import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, JsonType


class LoggingMessage(Base):
    __tablename__ = "logging_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source: Mapped[str] = mapped_column(String(150))
    level: Mapped[int] = mapped_column(Integer)
    message: Mapped[str] = mapped_column(String(1000))
    payload: Mapped[dict | None] = mapped_column(JsonType, nullable=True)
    timestamp: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), index=True)
