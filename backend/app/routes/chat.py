from fastapi import APIRouter, HTTPException, Body, Depends
from typing import List
from uuid import UUID
from pydantic import BaseModel

from backend.app.models.chat_session import ChatSession, PageContext
from backend.app.models.chat_message import ChatMessage
from backend.app.services.chat_service import chat_service
from backend.app.services.secret_manager import secret_manager

router = APIRouter()

class CreateSessionRequest(BaseModel):
    initial_context: PageContext

class CreateSessionResponse(BaseModel):
    session_id: UUID

class ChatMessageRequest(BaseModel):
    content: str

class ChatMessageResponse(BaseModel):
    content: str

class UpdateContextRequest(BaseModel):
    context: PageContext

@router.post("/sessions", response_model=CreateSessionResponse, status_code=201)
async def create_session(request: CreateSessionRequest):
    session = chat_service.create_session(request.initial_context)
    return CreateSessionResponse(session_id=session.id)

@router.post("/sessions/{session_id}/messages", response_model=ChatMessageResponse)
async def stream_chat_message(session_id: UUID, request: ChatMessageRequest):
    try:
        assistant_message = await chat_service.process_user_message(session_id, request.content)
        return ChatMessageResponse(content=assistant_message.content)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessage])
async def get_chat_history(session_id: UUID):
    messages = chat_service.get_messages(session_id)
    if not messages and not chat_service.get_session(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    return messages

@router.put("/sessions/{session_id}/context", status_code=204)
async def update_page_context(session_id: UUID, request: UpdateContextRequest):
    if not chat_service.get_session(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    chat_service.update_context(session_id, request.context)
    return

@router.delete("/sessions/{session_id}", status_code=204)
async def delete_chat_session(session_id: UUID):
    if not chat_service.get_session(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    chat_service.delete_session(session_id)
    return

# Additional endpoint to set API key (since it's user-provided)
class SetApiKeyRequest(BaseModel):
    api_key: str

@router.post("/config/api-key", status_code=204)
async def set_api_key(request: SetApiKeyRequest):
    secret_manager.set_secret("ANTHROPIC_API_KEY", request.api_key)
    return
