'use client';

import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
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

/**
 * ChatPanel is the main container for the chatbot interface.
 * It uses shadcn/ui Dialog to provide an accessible, modal-based chat experience.
 * The panel is triggered by a floating action button and contains the message list
 * and input area within a Card-styled layout.
 * 
 * This component follows the layout requirements of Task 2, providing a structured
 * container for subsequent integration of message history and input logic.
 */
export function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    // Logic for sending messages will be implemented in Task 4
    console.log('Sending message:', input);
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
                  {!apiKey ? (
                    <div className="py-8">
                      <ApiKeyForm onSubmit={setApiKey} />
                    </div>
                  ) : (
                    <>
                      {/* 
                        Placeholder for Chat Message List (Task 5).
                        This area will eventually render the conversation history.
                      */}
                      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4 py-10">
                        <div className="p-4 rounded-full bg-muted/50">
                          <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-semibold">How can I help you today?</p>
                          <p className="text-xs text-muted-foreground max-w-[240px] leading-relaxed mx-auto">
                            I can help you navigate the workflow, explain project details, or perform actions based on your current page.
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </CardContent>

            <CardFooter className="p-4 border-t bg-muted/10">
              <ChatInput
                value={input}
                onChange={setInput}
                onSend={handleSend}
                disabled={!apiKey}
                placeholder={!apiKey ? "Please set your API key first..." : "Type your message..."}
              />
            </CardFooter>
          </Card>
        </DialogContent>
      </Dialog>
    </div>
  );
}
