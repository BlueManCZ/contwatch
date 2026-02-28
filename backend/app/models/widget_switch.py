from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class WidgetSwitch(Base):
    __tablename__ = "widget_switches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str | None] = mapped_column(String(150), index=True, nullable=True)
    icon: Mapped[str | None] = mapped_column(String(100), nullable=True)
    attribute_id: Mapped[int] = mapped_column(ForeignKey("attributes.id"))
    attribute_compare: Mapped[str | None] = mapped_column(String(100), nullable=True)
    action_on_id: Mapped[int | None] = mapped_column(ForeignKey("actions.id"), nullable=True)
    action_off_id: Mapped[int | None] = mapped_column(ForeignKey("actions.id"), nullable=True)

    attribute: Mapped["Attribute"] = relationship(back_populates="widget_switches")  # noqa: F821
    action_on: Mapped["Action | None"] = relationship(  # noqa: F821
        back_populates="widget_switches_on", foreign_keys=[action_on_id]
    )
    action_off: Mapped["Action | None"] = relationship(  # noqa: F821
        back_populates="widget_switches_off", foreign_keys=[action_off_id]
    )
