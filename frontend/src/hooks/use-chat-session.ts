import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AnthropicClient } from '@/src/lib/chat/anthropic-client';
import { ChatMessage } from '@/src/types/chat';
import { PageContext } from '@/src/types/context';
import { updateChatContext, deleteChatSession, getChatHistory } from '@/src/lib/chat/api';

const MAX_MESSAGES = 100;

/**
 * Hook to manage the lifecycle of a chat session.
 * Handles session creation, context updates, and cleanup.
 */
export function useChatSession(initialContext: PageContext) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [client] = useState(() => new AnthropicClient());
  const sessionIdRef = useRef<string | null>(null);

  const initializeSession = useCallback(async (context: PageContext) => {
    setIsLoading(true);
    setError(null);
    try {
      const id = await client.initialize(context);
      setSessionId(id);
      sessionIdRef.current = id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize chat session';
      setError(new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const updateContext = useCallback(async (context: PageContext) => {
    if (!sessionIdRef.current) return;
    try {
      await updateChatContext(sessionIdRef.current, context);
    } catch (err) {
      console.error('Failed to update chat context:', err);
    }
  }, []);

  const endSession = useCallback(async () => {
    if (!sessionIdRef.current) return;
    try {
      await deleteChatSession(sessionIdRef.current);
      setSessionId(null);
      sessionIdRef.current = null;
    } catch (err) {
      console.error('Failed to delete chat session:', err);
    }
  }, []);

  // Initialize session on mount
  useEffect(() => {
    initializeSession(initialContext);
    
    return () => {
      // Cleanup session on unmount
      if (sessionIdRef.current) {
        deleteChatSession(sessionIdRef.current).catch(console.error);
      }
    };
  }, []); // Only on mount

  return {
    sessionId,
    isLoading,
    error,
    updateContext,
    endSession,
    client
  };
}

/**
 * Hook to manage chat messages within a session.
 * Handles sending messages and maintaining history in memory.
 */
export function useChatMessages(sessionId: string | null, client: AnthropicClient) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchHistory = useCallback(async (sid: string) => {
    try {
      const history = await getChatHistory(sid);
      setMessages(history.slice(-MAX_MESSAGES));
    } catch (err) {
      console.error('Failed to fetch chat history:', err);
    }
  }, []);

  useEffect(() => {
    if (sessionId) {
      fetchHistory(sessionId);
    } else {
      setMessages([]);
    }
  }, [sessionId, fetchHistory]);

  const sendMessage = useCallback(async (content: string) => {
    if (!sessionId) return;
    
    setIsSending(true);
    setError(null);

    // Optimistically add user message
    const userMessage: ChatMessage = {
      id: uuidv4(),
      session_id: sessionId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage].slice(-MAX_MESSAGES));

    try {
      const responseContent = await client.sendMessage(content);
      
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        session_id: sessionId,
        role: 'assistant',
        content: responseContent,
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage].slice(-MAX_MESSAGES));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(new Error(errorMessage));
    } finally {
      setIsSending(false);
    }
  }, [sessionId, client]);

  return {
    messages,
    isSending,
    error,
    sendMessage,
    clearMessages: () => setMessages([]),
  };
}
