from pydantic import BaseModel, Field
from uuid import UUID, uuid4
from datetime import datetime
from typing import Literal

class ChatMessage(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    session_id: UUID
    role: Literal["user", "assistant", "system"]
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
