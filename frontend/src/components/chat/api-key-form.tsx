'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Key, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ApiKeyFormProps {
  onSubmit: (apiKey: string) => void;
  initialValue?: string;
}

/**
 * ApiKeyForm provides a secure interface for users to input their Anthropic API key.
 * It includes validation for the key format, masking for security, and clear
 * communication about the ephemeral nature of the key storage.
 */
export function ApiKeyForm({ onSubmit, initialValue = '' }: ApiKeyFormProps) {
  const [apiKey, setApiKey] = useState(initialValue);
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedKey = apiKey.trim();
    
    if (!trimmedKey) {
      setError('API key is required');
      return;
    }

    // Basic validation for Anthropic API key format
    if (!trimmedKey.startsWith('sk-ant-')) {
      setError('Invalid format. Anthropic keys typically start with "sk-ant-"');
      return;
    }

    if (trimmedKey.length < 20) {
      setError('API key seems too short');
      return;
    }

    setError(null);
    onSubmit(trimmedKey);
  };

  return (
    <Card className="w-full border-dashed border-2 bg-muted/5 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          API Configuration
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          To use the AI Assistant, please provide your Anthropic Claude 3.5 API key. 
          The key is stored only in your browser's session memory and is never saved to our database.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Anthropic API Key
            </Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showKey ? "text" : "password"}
                placeholder="sk-ant-..."
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  if (error) setError(null);
                }}
                className={cn(
                  "pr-10 font-mono text-xs h-9",
                  error && "border-destructive focus-visible:ring-destructive"
                )}
                autoComplete="off"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                <span className="sr-only">
                  {showKey ? "Hide API key" : "Show API key"}
                </span>
              </Button>
            </div>
            {error && (
              <p className="text-[10px] font-medium text-destructive animate-in fade-in slide-in-from-top-1">
                {error}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full text-xs h-9 font-medium" size="sm">
            <Key className="mr-2 h-3.5 w-3.5" />
            Initialize Assistant
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
