from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.services.auth import get_current_user
from app.services.handler_manager import HandlerManager

DbSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


def get_handler_manager(request: Request) -> HandlerManager:
    return request.app.state.handler_manager


HandlerManagerDep = Annotated[HandlerManager, Depends(get_handler_manager)]
