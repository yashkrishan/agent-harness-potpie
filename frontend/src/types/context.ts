import { z } from 'zod';

export const PageContextSchema = z.object({
  route: z.string(),
  workflow_step: z.string(),
  project_state: z.record(z.any()),
});

export type PageContext = z.infer<typeof PageContextSchema>;
