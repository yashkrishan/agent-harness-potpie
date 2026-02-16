'use client';

import React, { useEffect, useRef } from 'react';
import { MessageSquare, Bot, User } from 'lucide-react';
import { ChatMessage } from '@/src/types/chat';
import { MessageRenderer } from './message-renderer';
import { cn } from '@/lib/utils';

interface MessageListProps {
  messages: ChatMessage[];
  isSending?: boolean;
}

/**
 * MessageList renders the conversation history between the user and the AI.
 * It handles auto-scrolling to the latest message and provides a loading
 * indicator when the assistant is generating a response.
 */
export function MessageList({ messages, isSending }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or when sending starts
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isSending]);

  if (messages.length === 0 && !isSending) {
    return (
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
    );
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "flex gap-3 max-w-[90%]",
            message.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
          )}
        >
          <div className={cn(
            "h-8 w-8 shrink-0 rounded-full flex items-center justify-center shadow-sm",
            message.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted border text-muted-foreground"
          )}>
            {message.role === 'user' ? (
              <User className="h-4 w-4" />
            ) : (
              <Bot className="h-4 w-4" />
            )}
          </div>
          
          <div className={cn(
            "flex flex-col gap-1",
            message.role === 'user' ? "items-end" : "items-start"
          )}>
            <div className={cn(
              "rounded-2xl px-4 py-2 text-sm shadow-sm",
              message.role === 'user' 
                ? "bg-primary text-primary-foreground rounded-tr-none" 
                : "bg-muted text-foreground rounded-tl-none border border-muted-foreground/10"
            )}>
              <MessageRenderer content={message.content} />
            </div>
            <span className="text-[10px] text-muted-foreground px-1">
              {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      ))}

      {isSending && (
        <div className="flex gap-3 max-w-[90%] mr-auto">
          <div className="h-8 w-8 shrink-0 rounded-full bg-muted border flex items-center justify-center text-muted-foreground shadow-sm">
            <Bot className="h-4 w-4" />
          </div>
          <div className="bg-muted text-foreground rounded-2xl rounded-tl-none px-4 py-3 text-sm border border-muted-foreground/10 shadow-sm">
            <div className="flex gap-1.5 items-center h-5">
              <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce"></span>
            </div>
          </div>
        </div>
      )}
      
      <div ref={scrollRef} />
    </div>
  );
}
