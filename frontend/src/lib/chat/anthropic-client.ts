import { 
  createChatSession, 
  sendChatMessage, 
  getChatHistory, 
  updateChatContext, 
  deleteChatSession 
} from './api';
import { PageContext } from '@/src/types/context';
import { ChatMessage } from '@/src/types/chat';

export class AnthropicClient {
  private sessionId: string | null = null;
  private timeout: number;

  constructor(timeout: number = 60000) {
    this.timeout = timeout;
  }

  /**
   * Initializes a new chat session with the given context.
   */
  async initialize(initialContext: PageContext): Promise<string> {
    const response = await createChatSession(initialContext);
    this.sessionId = response.session_id;
    return this.sessionId;
  }

  /**
   * Sends a message to the assistant and returns the response content.
   * Supports timeout and request cancellation.
   */
  async sendMessage(content: string, externalSignal?: AbortSignal): Promise<string> {
    if (!this.sessionId) {
      throw new Error('Chat session not initialized. Call initialize() first.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    // Link external signal if provided
    const onAbort = () => {
      controller.abort();
      clearTimeout(timeoutId);
    };

    if (externalSignal) {
      if (externalSignal.aborted) {
        onAbort();
      } else {
        externalSignal.addEventListener('abort', onAbort, { once: true });
      }
    }

    try {
      const response = await sendChatMessage(this.sessionId, content, controller.signal);
      return response.content;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        if (externalSignal?.aborted) {
          throw new Error('Request cancelled by user');
        }
        throw new Error(`Request timed out after ${this.timeout / 1000} seconds`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onAbort);
      }
    }
  }

  /**
   * Fetches the conversation history for the current session.
   */
  async getHistory(): Promise<ChatMessage[]> {
    if (!this.sessionId) {
      throw new Error('Chat session not initialized.');
    }
    return getChatHistory(this.sessionId);
  }

  /**
   * Updates the context for the current session.
   */
  async updateContext(context: PageContext): Promise<void> {
    if (!this.sessionId) {
      throw new Error('Chat session not initialized.');
    }
    return updateChatContext(this.sessionId, context);
  }

  /**
   * Deletes the current session and clears the session ID.
   */
  async cleanup(): Promise<void> {
    if (this.sessionId) {
      try {
        await deleteChatSession(this.sessionId);
      } catch (error) {
        console.error('Failed to cleanup chat session:', error);
      } finally {
        this.sessionId = null;
      }
    }
  }

  /**
   * Returns the current session ID.
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Manually sets the session ID (e.g., for resuming a session).
   */
  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }
}

// Export a default instance with default timeout
export const anthropicClient = new AnthropicClient();
