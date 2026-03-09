from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.base import ExecutableOption

from app.models.base import Base


async def get_or_404[T: Base](
    db: AsyncSession,
    model: type[T],
    entity_id: int,
    *,
    options: list[ExecutableOption] | None = None,
    detail: str | None = None,
) -> T:
    """Fetch a single entity by primary key or raise HTTP 404."""
    stmt = select(model).where(model.id == entity_id)  # type: ignore[attr-defined]
    if options:
        stmt = stmt.options(*options)
    result = await db.execute(stmt)
    entity = result.scalar_one_or_none()
    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail or f"{model.__name__} not found",
        )
    return entity
