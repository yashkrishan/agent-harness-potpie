import { describe, it, expect } from "vitest";
import { ideaSchema } from "./validations";

describe("ideaSchema", () => {
  describe("valid inputs", () => {
    it("should accept exactly 10 characters", () => {
      const result = ideaSchema.safeParse("1234567890");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("1234567890");
      }
    });

    it("should accept 10 characters with leading/trailing whitespace", () => {
      const result = ideaSchema.safeParse("   1234567890   ");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("1234567890");
      }
    });

    it("should accept exactly 500 characters", () => {
      const input = "a".repeat(500);
      const result = ideaSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(500);
      }
    });


    it("should accept typical idea text", () => {
      const result = ideaSchema.safeParse(
        "Build a task management app with drag and drop functionality"
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(
          "Build a task management app with drag and drop functionality"
        );
      }
    });

    it("should accept text with special characters", () => {
      const result = ideaSchema.safeParse(
        "Create @React app with #TypeScript! Need: forms, API, auth."
      );
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs - too short", () => {
    it("should reject empty string", () => {
      const result = ideaSchema.safeParse("");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Idea cannot be empty"
        );
      }
    });


    it("should reject whitespace-only string", () => {
      const result = ideaSchema.safeParse("   \n\t   ");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Idea cannot be empty"
        );
      }
    });


    it("should reject 5 characters", () => {
      const result = ideaSchema.safeParse("abcde");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Idea must be at least 10 characters (currently 5)"
        );
      }
    });


    it("should reject 9 characters", () => {
      const result = ideaSchema.safeParse("123456789");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Idea must be at least 10 characters (currently 9)"
        );
      }
    });

    it("should reject 9 characters with whitespace padding", () => {
      const result = ideaSchema.safeParse("  123456789  ");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Idea must be at least 10 characters (currently 9)"
        );
      }
    });
  });

  describe("invalid inputs - too long", () => {
    it("should reject 501 characters", () => {
      const input = "a".repeat(501);
      const result = ideaSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Idea must be at most 500 characters (currently 501)"
        );
      }
    });

    it("should reject 600 characters", () => {
      const input = "a".repeat(600);
      const result = ideaSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Idea must be at most 500 characters (currently 600)"
        );
      }
    });

    it("should reject 1000 characters", () => {
      const input = "a".repeat(1000);
      const result = ideaSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Idea must be at most 500 characters (currently 1000)"
        );
      }
    });
  });

  describe("error message formatting", () => {
    it("should provide correct error message for empty input", () => {
      const result = ideaSchema.safeParse("");
      expect(result.success).toBe(false);
      if (!result.success) {
        const message = result.error.issues[0].message;
        expect(message).toContain("empty");
      }
    });

    it("should provide correct error message for too short input", () => {
      const result = ideaSchema.safeParse("short");
      expect(result.success).toBe(false);
      if (!result.success) {
        const message = result.error.issues[0].message;
        expect(message).toContain("at least 10");
        expect(message).toContain("currently 5");
      }
    });


    it("should provide correct error message for too long input", () => {
      const result = ideaSchema.safeParse("a".repeat(550));
      expect(result.success).toBe(false);
      if (!result.success) {
        const message = result.error.issues[0].message;
        expect(message).toContain("at most 500");
        expect(message).toContain("currently 550");
      }
    });

    it("should return trimmed string on successful validation", () => {
      const result = ideaSchema.safeParse("  some idea text  ");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("some idea text");
      }
    });
  });
});
