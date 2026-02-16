import { z } from 'zod';
import { PageContextSchema } from './context';

export const ChatMessageSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  created_at: z.string().datetime(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatSessionSchema = z.object({
  id: z.string().uuid(),
  created_at: z.string().datetime(),
  context_snapshot: PageContextSchema,
});

export type ChatSession = z.infer<typeof ChatSessionSchema>;
