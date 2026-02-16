import { z } from 'zod';

export const LLMConfigSchema = z.object({
  apiKey: z.string().optional(),
  model: z.string().default('claude-3-5-sonnet-20240620'),
  temperature: z.number().min(0).max(1).default(0.7),
  max_tokens: z.number().default(4096),
  top_p: z.number().optional(),
  top_k: z.number().optional(),
  stop_sequences: z.array(z.string()).optional(),
});

export type LLMConfig = z.infer<typeof LLMConfigSchema>;
