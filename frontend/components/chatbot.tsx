"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, User, Send, X, Minimize2, Maximize2, Loader2 } from "lucide-react";
import { CheckCircle2, FileCode } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant" | "thinking";
  content: string;
  timestamp?: Date;
}

interface ContextLabel {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

interface ChatbotProps {
  contextLabels?: ContextLabel[];
  initialMessage?: string;
  placeholder?: string;
  onSendMessage?: (message: string) => void;
  onMinimizeChange?: (minimized: boolean) => void;
  externalMessages?: ChatMessage[];
  isThinking?: boolean;
}

export function Chatbot({
  contextLabels = [],
  initialMessage = "Hello! How can I help you?",
  placeholder = "Ask a question...",
  onSendMessage,
  onMinimizeChange,
  externalMessages,
  isThinking = false,
}: ChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: initialMessage,
    },
  ]);
  const [input, setInput] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevExternalMessagesRef = useRef<string>("");
  const hasInitializedRef = useRef(false);

  // Sync external messages - only update if they're actually different
  useEffect(() => {
    if (externalMessages && externalMessages.length > 0) {
      const externalMessagesStr = JSON.stringify(externalMessages);
      // Only update if the external messages have actually changed
      if (prevExternalMessagesRef.current !== externalMessagesStr) {
        prevExternalMessagesRef.current = externalMessagesStr;
        // Deduplicate messages by content and role
        const seen = new Set<string>();
        const uniqueMessages = externalMessages.filter((msg) => {
          const key = `${msg.role}-${msg.content}`;
          if (seen.has(key)) {
            return false;
          }
          seen.add(key);
          return true;
        });
        setMessages(uniqueMessages);
        hasInitializedRef.current = true;
      }
    } else if (!hasInitializedRef.current) {
      // Only set initial message if we haven't initialized with external messages yet
      setMessages([
        {
          role: "assistant",
          content: initialMessage,
        },
      ]);
    }
  }, [externalMessages, initialMessage]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const handleMinimize = (minimized: boolean) => {
    setIsMinimized(minimized);
    if (onMinimizeChange) {
      onMinimizeChange(minimized);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      role: "user",
      content: input.trim(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Call custom handler if provided
    if (onSendMessage) {
      onSendMessage(input.trim());
    }

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "I can help you with that. What specific information do you need?",
        "Based on the current context, here's what I can tell you...",
        "That's a great question! Let me help you understand that better.",
        "I understand your question. Here's the information you're looking for...",
      ];
      const randomResponse =
        responses[Math.floor(Math.random() * responses.length)];
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: randomResponse },
      ]);
    }, 1000);
  };

  if (isMinimized) {
    return (
      <div className="absolute right-0 top-0 h-full w-12 bg-white border-l border-gray-200 shadow-lg z-40 flex flex-col items-center py-3">
        <Button
          onClick={() => handleMinimize(false)}
          variant="ghost"
          size="icon"
          className="h-9 w-9 hover:bg-gray-100 rounded-lg"
        >
          <Maximize2 className="h-4 w-4 text-gray-600" />
        </Button>
        <div className="mt-2 w-8 h-8 rounded-full bg-black flex items-center justify-center">
          <Bot className="h-4 w-4 text-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="absolute right-0 top-0 h-full w-[400px] bg-white border-l border-gray-200 shadow-2xl z-40 flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-gray-900">AI Assistant</h3>
            <p className="text-xs text-gray-500">Ask me anything</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-gray-100"
            onClick={() => handleMinimize(true)}
          >
            <Minimize2 className="h-4 w-4 text-gray-600" />
          </Button>
        </div>
      </div>

      {/* Context Labels */}
      {contextLabels.length > 0 && (
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex flex-wrap gap-2">
          {contextLabels.map((label, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black text-white rounded-md text-xs font-medium shadow-sm"
            >
              {label.icon && <span className="flex-shrink-0">{label.icon}</span>}
              <span className="truncate max-w-[120px]">{label.value}</span>
            </span>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50">
        {messages.map((message, index) => {
          // Create a unique key based on content and index to prevent duplicates
          const messageKey = `${message.role}-${message.content.substring(0, 50)}-${index}`;
          return (
          <div
            key={messageKey}
            className={`flex gap-2.5 ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {(message.role === "assistant" || message.role === "thinking") && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center mt-0.5">
                {message.role === "thinking" ? (
                  <Loader2 className="h-3.5 w-3.5 text-gray-600 animate-spin" />
                ) : (
                  <Bot className="h-3.5 w-3.5 text-gray-600" />
                )}
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-lg px-3.5 py-2.5 shadow-sm ${
                message.role === "user"
                  ? "bg-black text-white rounded-br-sm"
                  : message.role === "thinking"
                  ? "bg-blue-50 text-gray-700 border border-blue-200 rounded-bl-sm"
                  : "bg-white text-gray-900 border border-gray-200 rounded-bl-sm"
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            </div>
            {message.role === "user" && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-black flex items-center justify-center mt-0.5">
                <User className="h-3.5 w-3.5 text-white" />
              </div>
            )}
          </div>
          );
        })}
        {/* Thinking indicator */}
        {isThinking && (
          <div className="flex gap-2.5 justify-start">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center mt-0.5">
              <Loader2 className="h-3.5 w-3.5 text-gray-600 animate-spin" />
            </div>
            <div className="max-w-[80%] rounded-lg px-3.5 py-2.5 shadow-sm bg-blue-50 text-gray-700 border border-blue-200 rounded-bl-sm">
              <div className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                <p className="text-sm text-gray-600">Thinking...</p>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 px-4 py-3 bg-white shadow-lg">
        <form onSubmit={handleSend} className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            className="min-h-[52px] max-h-[120px] resize-none border-gray-300 focus:border-black focus:ring-1 focus:ring-black"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            className="flex-shrink-0 h-[52px] w-[52px] bg-black hover:bg-black/90 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <p className="text-xs text-gray-400 mt-2 text-center">Press Enter to send, Shift+Enter for new line</p>
      </div>
    </div>
  );
}
