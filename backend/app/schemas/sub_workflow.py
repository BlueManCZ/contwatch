from datetime import datetime

from pydantic import BaseModel

from app.schemas.common import OrmBase
from app.schemas.workflow import WorkflowData


class SubWorkflowCreate(BaseModel):
    name: str
    description: str = ""


class SubWorkflowUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class SubWorkflowRead(OrmBase, BaseModel):
    id: int
    name: str
    description: str
    graph: WorkflowData | None = None
    user_id: int
    created_at: datetime
    updated_at: datetime


class SubWorkflowSummary(OrmBase, BaseModel):
    id: int
    name: str
    description: str
