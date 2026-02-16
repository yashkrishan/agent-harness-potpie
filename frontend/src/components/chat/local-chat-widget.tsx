'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChatPanel } from './chat-panel';
import { useChatSession, useChatMessages } from '@/src/hooks/use-chat-session';
import { PageContext } from '@/src/types/context';
import { setBackendApiKey } from '@/src/lib/chat/api';

interface LocalChatWidgetProps {
  context: PageContext;
}

/**
 * LocalChatWidget is the top-level component for the page-specific chatbot.
 * It manages the lifecycle of the chat session, handles API key submission,
 * and coordinates between the chat hooks and the UI panel.
 * 
 * It ensures that the chat context is updated whenever the user navigates
 * or the page state changes.
 */
export function LocalChatWidget({ context }: LocalChatWidgetProps) {
  const { sessionId, isLoading: isSessionLoading, client, updateContext } = useChatSession(context);
  const { messages, isSending, sendMessage, error: chatError } = useChatMessages(sessionId, client);
  
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isApiKeySetting, setIsApiKeySetting] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<Error | null>(null);

  // Update context when it changes (e.g., user navigates to a different workflow step)
  useEffect(() => {
    if (sessionId) {
      updateContext(context);
    }
  }, [context, sessionId, updateContext]);

  /**
   * Handles the submission of the Anthropic API key.
   * The key is sent to the backend to be stored in the ephemeral Secret Manager.
   */
  const handleApiKeySubmit = useCallback(async (key: string) => {
    setIsApiKeySetting(true);
    setApiKeyError(null);
    try {
      await setBackendApiKey(key);
      setApiKey(key);
    } catch (err) {
      console.error('Failed to set API key:', err);
      setApiKeyError(err instanceof Error ? err : new Error('Failed to set API key. Please try again.'));
    } finally {
      setIsApiKeySetting(false);
    }
  }, []);

  return (
    <ChatPanel 
      messages={messages}
      isSending={isSending}
      isSessionLoading={isSessionLoading || isApiKeySetting}
      onSendMessage={sendMessage}
      apiKey={apiKey}
      onApiKeySubmit={handleApiKeySubmit}
      error={chatError || apiKeyError}
    />
  );
}
