from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, JsonType


class Handler(Base):
    __tablename__ = "handlers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    type: Mapped[str] = mapped_column(String(100))
    options: Mapped[dict] = mapped_column(JsonType, default=dict)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    attributes: Mapped[list["Attribute"]] = relationship(back_populates="handler", cascade="all, delete-orphan")  # noqa: F821
    data_units: Mapped[list["DataUnit"]] = relationship(back_populates="handler", cascade="all, delete-orphan")  # noqa: F821
