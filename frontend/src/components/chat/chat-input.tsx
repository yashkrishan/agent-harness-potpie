'use client';

import React, { useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * ChatInput provides an auto-resizing textarea for message entry.
 * It handles 'Enter' to send (and 'Shift+Enter' for new lines) and
 * dynamically adjusts its height based on content up to a maximum limit.
 */
export function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  placeholder = "Type your message...",
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize logic to handle multi-line input gracefully
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSend();
      }
    }
  };

  return (
    <div className="relative flex items-end gap-2 w-full">
      <div className="relative flex-1">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "min-h-[40px] max-h-[200px] py-2.5 pr-2 resize-none transition-[height] duration-100",
            "scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent",
            "focus-visible:ring-1 focus-visible:ring-primary border-muted-foreground/20"
          )}
        />
      </div>
      <Button
        size="icon"
        onClick={onSend}
        disabled={disabled || !value.trim()}
        className={cn(
          "shrink-0 mb-0.5 h-9 w-9 transition-all duration-200",
          value.trim() ? "opacity-100 scale-100" : "opacity-50 scale-95"
        )}
      >
        <Send className="h-4 w-4" />
        <span className="sr-only">Send message</span>
      </Button>
    </div>
  );
}
