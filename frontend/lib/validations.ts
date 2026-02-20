import { z } from "zod";

/**
 * Zod validation schema for idea input
 * - Min 10 characters after trimming whitespace
 * - Max 500 characters after trimming whitespace
 */
export const ideaSchema = z
  .string()
  .min(1, "Idea cannot be empty")
  .transform((val, ctx) => {
    const trimmed = val.trim();
    if (trimmed.length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: 10,
        type: "string",
        inclusive: true,
        message: `Idea must be at least 10 characters (currently ${trimmed.length})`,
      });
      return z.NEVER;
    }
    if (trimmed.length > 500) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_big,
        maximum: 500,
        type: "string",
        inclusive: true,
        message: `Idea must be at most 500 characters (currently ${trimmed.length})`,
      });
      return z.NEVER;
    }
    return trimmed;
  });

/**
 * TypeScript type inferred from the ideaSchema
 * Represents valid idea input after validation
 */
export type IdeaInput = z.infer<typeof ideaSchema>;

/**
 * Validates idea input and returns the result
 * @param idea - The raw idea string to validate
 * @returns Object with success boolean and either valid data or error message
 */
export function validateIdea(idea: unknown): { success: true; data: IdeaInput } | { success: false; error: string } {
  const result = ideaSchema.safeParse(idea);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errorMessage = result.error.errors
    .map((err) => err.message)
    .join("; ");
  
  return { success: false, error: errorMessage };
}
