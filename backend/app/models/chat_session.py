from pydantic import BaseModel, Field
from uuid import UUID, uuid4
from datetime import datetime
from typing import Any, Dict

class PageContext(BaseModel):
    route: str
    workflow_step: str
    project_state: Dict[str, Any]

class ChatSession(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    context_snapshot: PageContext
