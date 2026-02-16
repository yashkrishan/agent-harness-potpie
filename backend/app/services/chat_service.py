from typing import Dict, List, Optional
from uuid import UUID, uuid4
from datetime import datetime
from backend.app.models.chat_session import ChatSession, PageContext
from backend.app.models.chat_message import ChatMessage
from backend.app.models.llm_config import LLMConfig
from backend.app.services.anthropic_client import anthropic_client

class ChatService:
    def __init__(self):
        # In-memory storage for sessions and messages
        self._sessions: Dict[UUID, ChatSession] = {}
        self._messages: Dict[UUID, List[ChatMessage]] = {}

    def create_session(self, initial_context: PageContext) -> ChatSession:
        session = ChatSession(
            id=uuid4(),
            created_at=datetime.utcnow(),
            context_snapshot=initial_context
        )
        self._sessions[session.id] = session
        self._messages[session.id] = []
        return session

    def get_session(self, session_id: UUID) -> Optional[ChatSession]:
        return self._sessions.get(session_id)

    def update_context(self, session_id: UUID, context: PageContext):
        if session_id in self._sessions:
            self._sessions[session_id].context_snapshot = context

    def delete_session(self, session_id: UUID):
        if session_id in self._sessions:
            del self._sessions[session_id]
        if session_id in self._messages:
            del self._messages[session_id]

    def get_messages(self, session_id: UUID) -> List[ChatMessage]:
        return self._messages.get(session_id, [])

    def add_message(self, session_id: UUID, role: str, content: str) -> ChatMessage:
        message = ChatMessage(
            id=uuid4(),
            session_id=session_id,
            role=role,
            content=content,
            created_at=datetime.utcnow()
        )
        if session_id not in self._messages:
            self._messages[session_id] = []
        self._messages[session_id].append(message)
        return message

    async def process_user_message(self, session_id: UUID, content: str) -> ChatMessage:
        session = self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        # Add user message
        self.add_message(session_id, "user", content)

        # Prepare system prompt with context
        system_prompt = self._build_system_prompt(session.context_snapshot)

        # Get history for LLM
        history = self.get_messages(session_id)
        
        # Use default config for now, or could be passed in
        config = LLMConfig()

        # Generate assistant response
        response_content = await anthropic_client.generate_response(
            messages=history,
            system_prompt=system_prompt,
            config=config
        )

        # Add assistant message
        return self.add_message(session_id, "assistant", response_content)

    def _build_system_prompt(self, context: PageContext) -> str:
        return f"""You are a helpful assistant for a developer build agent application.
Current Page Context:
- Route: {context.route}
- Workflow Step: {context.workflow_step}
- Project State: {context.project_state}

Provide page-specific contextual awareness and action-oriented capabilities.
Maintain security and follow XSS protection guidelines.
"""

chat_service = ChatService()
