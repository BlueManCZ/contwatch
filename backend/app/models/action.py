from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Action(Base):
    __tablename__ = "actions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(150), index=True)
    message: Mapped[str] = mapped_column(String(500))
    handler_id: Mapped[int | None] = mapped_column(ForeignKey("handlers.id", ondelete="CASCADE"), nullable=True)

    handler: Mapped["Handler | None"] = relationship(back_populates="actions")  # noqa: F821
    widget_switches_on: Mapped[list["WidgetSwitch"]] = relationship(  # noqa: F821
        back_populates="action_on", foreign_keys="WidgetSwitch.action_on_id"
    )
    widget_switches_off: Mapped[list["WidgetSwitch"]] = relationship(  # noqa: F821
        back_populates="action_off", foreign_keys="WidgetSwitch.action_off_id"
    )
