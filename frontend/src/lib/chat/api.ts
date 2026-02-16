import { ChatMessage } from '@/src/types/chat';
import { PageContext } from '@/src/types/context';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface CreateSessionResponse {
  session_id: string;
}

export interface ChatMessageResponse {
  content: string;
}

/**
 * Initialize a new ephemeral chat session with initial page context.
 */
export async function createChatSession(initialContext: PageContext): Promise<CreateSessionResponse> {
  const response = await fetch(`${API_BASE}/api/v1/chat/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initial_context: initialContext }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to create chat session: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Send user message and receive response from Claude 3.5.
 */
export async function sendChatMessage(
  sessionId: string,
  content: string,
  signal?: AbortSignal
): Promise<ChatMessageResponse> {
  const response = await fetch(`${API_BASE}/api/v1/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
    signal,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to send message: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Retrieve full conversation history for a specific session.
 */
export async function getChatHistory(sessionId: string): Promise<ChatMessage[]> {
  const response = await fetch(`${API_BASE}/api/v1/chat/sessions/${sessionId}/messages`);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to get chat history: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Update session context when user navigates to different workflow steps.
 */
export async function updateChatContext(sessionId: string, context: PageContext): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/chat/sessions/${sessionId}/context`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to update chat context: ${response.statusText}`);
  }
}

/**
 * Terminate chat session and clear in-memory conversation data.
 */
export async function deleteChatSession(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/chat/sessions/${sessionId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to delete chat session: ${response.statusText}`);
  }
}

/**
 * Set the Anthropic API key in the backend secret manager.
 */
export async function setBackendApiKey(apiKey: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/chat/config/api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to set API key: ${response.statusText}`);
  }
}
