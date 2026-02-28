from pydantic import BaseModel

from app.schemas.common import OrmBase


class UserRead(OrmBase, BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool


class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: str = "user"


class UserUpdate(BaseModel):
    email: str | None = None
    role: str | None = None
    is_active: bool | None = None
    password: str | None = None
