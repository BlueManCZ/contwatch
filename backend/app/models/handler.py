import datetime

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, JsonType


class Handler(Base):
    __tablename__ = "handlers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    type: Mapped[str] = mapped_column(String(100))
    label: Mapped[str | None] = mapped_column(String(150), nullable=True)
    options: Mapped[dict] = mapped_column(JsonType, default=dict)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    last_active: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    attributes: Mapped[list["Attribute"]] = relationship(  # noqa: F821
        back_populates="handler",
        cascade="all, delete-orphan",
        order_by="Attribute.order.asc().nullslast(), Attribute.id.asc()",
    )
    actions: Mapped[list["Action"]] = relationship(back_populates="handler", cascade="all, delete-orphan")  # noqa: F821
    data_units: Mapped[list["DataUnit"]] = relationship(back_populates="handler", cascade="all, delete-orphan")  # noqa: F821
