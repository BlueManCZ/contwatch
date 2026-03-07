from sqlalchemy import JSON, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Widget(Base):
    __tablename__ = "widgets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    type: Mapped[str] = mapped_column(String(20))
    order: Mapped[int] = mapped_column(Integer, default=0)
    name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    icon: Mapped[str | None] = mapped_column(String(100), nullable=True)
    attribute_id: Mapped[int | None] = mapped_column(ForeignKey("attributes.id", ondelete="CASCADE"), nullable=True)
    config: Mapped[dict] = mapped_column(JSON().with_variant(JSONB, "postgresql"), default=dict, server_default="{}")

    attribute: Mapped["Attribute | None"] = relationship(back_populates="widgets")  # noqa: F821
