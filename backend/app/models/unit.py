from sqlalchemy import Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Unit(Base):
    __tablename__ = "units"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), index=True)
    base_unit: Mapped[str | None] = mapped_column(String(100), index=True, nullable=True)
    base_ratio: Mapped[float | None] = mapped_column(Float, nullable=True)
