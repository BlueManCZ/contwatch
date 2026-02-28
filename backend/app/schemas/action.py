import json

from pydantic import BaseModel, field_validator

from app.schemas.common import OrmBase


class ActionRead(OrmBase, BaseModel):
    id: int
    name: str
    message: str


class ActionCreate(BaseModel):
    name: str
    message: str

    @field_validator("message")
    @classmethod
    def message_must_be_json(cls, v: str) -> str:
        try:
            json.loads(v)
        except (json.JSONDecodeError, TypeError) as e:
            raise ValueError("message must be valid JSON") from e
        return v


class ActionUpdate(BaseModel):
    name: str | None = None
    message: str | None = None

    @field_validator("message")
    @classmethod
    def message_must_be_json(cls, v: str | None) -> str | None:
        if v is not None:
            try:
                json.loads(v)
            except (json.JSONDecodeError, TypeError) as e:
                raise ValueError("message must be valid JSON") from e
        return v
