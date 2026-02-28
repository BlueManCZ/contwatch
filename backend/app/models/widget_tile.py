from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class WidgetTile(Base):
    __tablename__ = "widget_tiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    attribute_id: Mapped[int] = mapped_column(ForeignKey("attributes.id"))

    attribute: Mapped["Attribute"] = relationship(back_populates="widget_tiles")  # noqa: F821
