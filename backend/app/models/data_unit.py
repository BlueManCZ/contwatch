import datetime

from sqlalchemy import DateTime, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class DataUnit(Base):
    __tablename__ = "data_units"

    timestamp: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    attribute_id: Mapped[int] = mapped_column(ForeignKey("attributes.id", ondelete="CASCADE"), primary_key=True)
    handler_id: Mapped[int] = mapped_column(ForeignKey("handlers.id", ondelete="CASCADE"))
    value: Mapped[float] = mapped_column(Float)

    handler: Mapped["Handler"] = relationship(back_populates="data_units")  # noqa: F821
    attribute: Mapped["Attribute"] = relationship(back_populates="data_units")  # noqa: F821
