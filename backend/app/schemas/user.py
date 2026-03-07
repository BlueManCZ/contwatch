from pydantic import BaseModel, Field

from app.schemas.common import OrmBase

MIN_PASSWORD_LENGTH = 8


class UserRead(OrmBase, BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool


class UserCreate(BaseModel):
    username: str
    email: str
    password: str = Field(min_length=MIN_PASSWORD_LENGTH)
    role: str = "user"


class UserUpdate(BaseModel):
    email: str | None = None
    role: str | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=MIN_PASSWORD_LENGTH)
