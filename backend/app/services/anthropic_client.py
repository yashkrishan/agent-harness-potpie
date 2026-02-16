import anthropic
from typing import List, Dict, Any, Optional
from backend.app.models.chat_message import ChatMessage
from backend.app.models.llm_config import LLMConfig
from backend.app.services.secret_manager import secret_manager

class AnthropicClient:
    def __init__(self):
        self._client: Optional[anthropic.Anthropic] = None

    def _get_client(self) -> anthropic.Anthropic:
        api_key = secret_manager.get_secret("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("Anthropic API key not found in Secret Manager")
        
        if not self._client or self._client.api_key != api_key:
            self._client = anthropic.Anthropic(api_key=api_key)
        return self._client

    async def generate_response(
        self, 
        messages: List[ChatMessage], 
        system_prompt: str,
        config: LLMConfig
    ) -> str:
        client = self._get_client()
        
        # Convert ChatMessage objects to Anthropic message format
        anthropic_messages = [
            {"role": msg.role, "content": msg.content}
            for msg in messages if msg.role in ["user", "assistant"]
        ]

        response = client.messages.create(
            model=config.model,
            max_tokens=config.max_tokens,
            temperature=config.temperature,
            system=system_prompt,
            messages=anthropic_messages,
            top_p=config.top_p if config.top_p is not None else anthropic.NOT_GIVEN,
            top_k=config.top_k if config.top_k is not None else anthropic.NOT_GIVEN,
            stop_sequences=config.stop_sequences if config.stop_sequences is not None else anthropic.NOT_GIVEN,
        )

        return response.content[0].text

anthropic_client = AnthropicClient()
