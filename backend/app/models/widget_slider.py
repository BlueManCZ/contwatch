from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class WidgetSlider(Base):
    __tablename__ = "widget_sliders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str | None] = mapped_column(String(150), index=True, nullable=True)
    icon: Mapped[str | None] = mapped_column(String(100), nullable=True)
    attribute_id: Mapped[int] = mapped_column(ForeignKey("attributes.id"))
    action_id: Mapped[int] = mapped_column(ForeignKey("actions.id", ondelete="CASCADE"))
    param_key: Mapped[str] = mapped_column(String(100))
    min: Mapped[float] = mapped_column(Float, default=0)
    max: Mapped[float] = mapped_column(Float, default=100)
    step: Mapped[float] = mapped_column(Float, default=1)
    unit: Mapped[str | None] = mapped_column(String(50), nullable=True)

    attribute: Mapped["Attribute"] = relationship(back_populates="widget_sliders")  # noqa: F821
    action: Mapped["Action"] = relationship(back_populates="widget_sliders")  # noqa: F821
