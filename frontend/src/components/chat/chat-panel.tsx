'use client';

import React, { useState } from 'react';
import { MessageSquare, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatInput } from './chat-input';
import { ApiKeyForm } from './api-key-form';
import { MessageList } from './message-list';
import { ChatMessage } from '@/src/types/chat';

interface ChatPanelProps {
  messages: ChatMessage[];
  isSending: boolean;
  isSessionLoading: boolean;
  onSendMessage: (content: string) => void;
  apiKey: string | null;
  onApiKeySubmit: (apiKey: string) => void;
  error: Error | null;
}

/**
 * ChatPanel is the main container for the chatbot interface.
 * It uses shadcn/ui Dialog to provide an accessible, modal-based chat experience.
 * The panel is triggered by a floating action button and contains the message list
 * and input area within a Card-styled layout.
 * 
 * This component has been refactored to accept props from a parent controller
 * (LocalChatWidget) which manages the chat session and message state.
 */
export function ChatPanel({
  messages,
  isSending,
  isSessionLoading,
  onSendMessage,
  apiKey,
  onApiKeySubmit,
  error
}: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim() || isSending) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-2xl hover:scale-105 transition-transform duration-200 bg-primary text-primary-foreground"
            aria-label="Open chat assistant"
          >
            <MessageSquare className="h-6 w-6" />
          </Button>
        </DialogTrigger>
        <DialogContent 
          className="sm:max-w-[450px] h-[80vh] p-0 gap-0 overflow-hidden border-none bg-transparent shadow-none"
        >
          <Card className="flex flex-col h-full w-full shadow-2xl border-muted bg-background overflow-hidden">
            <DialogHeader className="p-4 border-b bg-muted/30 text-left sm:text-left">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                AI Assistant
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Powered by Claude 3.5 • Context Aware
              </DialogDescription>
            </DialogHeader>
            
            <CardContent className="flex-1 p-0 overflow-hidden bg-background">
              <ScrollArea className="h-full">
                <div className="flex flex-col gap-4 p-4">
                  {error && (
                    <div className="flex items-start gap-2 p-3 text-xs bg-destructive/10 text-destructive rounded-md border border-destructive/20 mb-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <p>{error.message}</p>
                    </div>
                  )}
                  
                  {isSessionLoading ? (
                    <div className="space-y-6 py-4">
                      <div className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                        <div className="h-16 w-3/4 bg-muted animate-pulse rounded-2xl rounded-tl-none" />
                      </div>
                      <div className="flex gap-3 flex-row-reverse">
                        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                        <div className="h-12 w-1/2 bg-muted animate-pulse rounded-2xl rounded-tr-none" />
                      </div>
                      <div className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                        <div className="h-20 w-2/3 bg-muted animate-pulse rounded-2xl rounded-tl-none" />
                      </div>
                    </div>
                  ) : !apiKey ? (
                    <div className="py-8">
                      <ApiKeyForm onSubmit={onApiKeySubmit} />
                    </div>
                  ) : (
                    <MessageList messages={messages} isSending={isSending} />
                  )}
                </div>
              </ScrollArea>
            </CardContent>

            <CardFooter className="p-4 border-t bg-muted/10">
              <ChatInput
                value={input}
                onChange={setInput}
                onSend={handleSend}
                disabled={!apiKey || isSending}
                placeholder={!apiKey ? "Please set your API key first..." : "Type your message..."}
              />
            </CardFooter>
          </Card>
        </DialogContent>
      </Dialog>
    </div>
  );
}
