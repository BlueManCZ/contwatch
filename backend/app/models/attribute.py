from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Attribute(Base):
    __tablename__ = "attributes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(150), index=True)
    handler_id: Mapped[int] = mapped_column(ForeignKey("handlers.id"))
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    unit: Mapped[str | None] = mapped_column(String(50), nullable=True)
    label: Mapped[str | None] = mapped_column(String(150), nullable=True)
    icon: Mapped[str | None] = mapped_column(String(100), nullable=True)
    order: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rounding: Mapped[int | None] = mapped_column(Integer, nullable=True)
    color: Mapped[str | None] = mapped_column(String(50), nullable=True)

    handler: Mapped["Handler"] = relationship(back_populates="attributes")  # noqa: F821
    data_units: Mapped[list["DataUnit"]] = relationship(back_populates="attribute", cascade="all, delete-orphan")  # noqa: F821
    widget_tiles: Mapped[list["WidgetTile"]] = relationship(back_populates="attribute", cascade="all, delete-orphan")  # noqa: F821
    widget_switches: Mapped[list["WidgetSwitch"]] = relationship(  # noqa: F821
        back_populates="attribute", cascade="all, delete-orphan"
    )
    widget_sliders: Mapped[list["WidgetSlider"]] = relationship(  # noqa: F821
        back_populates="attribute", cascade="all, delete-orphan"
    )
