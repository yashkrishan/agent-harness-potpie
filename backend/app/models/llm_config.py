from pydantic import BaseModel, Field
from typing import Optional, List

class LLMConfig(BaseModel):
    api_key: Optional[str] = None
    model: str = "claude-3-5-sonnet-20240620"
    temperature: float = Field(default=0.7, ge=0.0, le=1.0)
    max_tokens: int = 4096
    top_p: Optional[float] = None
    top_k: Optional[int] = None
    stop_sequences: Optional[List[str]] = None
