import { z } from "zod";
import {
  ACCEPTED_FILE_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
} from "./constants";

// ──────────────────────────────────────────────────────────
// Zod Validation Schema — with conditional business logic
// ──────────────────────────────────────────────────────────

export const issueFormSchema = z
  .object({
    applicationId: z
      .number({ required_error: "Please select an application." })
      .int()
      .positive("Please select an application."),

    environment: z.enum(["UAT", "Staging", "Prod"], {
      required_error: "Please select an environment.",
    }),

    module: z
      .string({ required_error: "Please enter a module or page name." })
      .min(1, "Module or page name is required.")
      .max(100, "Module or page name must not exceed 100 characters."),

    title: z
      .string()
      .min(5, "Title must be at least 5 characters.")
      .max(200, "Title must not exceed 200 characters."),

    categoryId: z
      .number({ required_error: "Please select a category." })
      .int()
      .positive("Please select a category."),

    severityId: z
      .number({ required_error: "Please select a severity level." })
      .int()
      .positive("Please select a severity level."),

    expectedResult: z
      .string()
      .min(10, "Expected result must be at least 10 characters.")
      .max(2000, "Expected result must not exceed 2000 characters."),

    actualResult: z
      .string()
      .min(10, "Actual result must be at least 10 characters.")
      .max(2000, "Actual result must not exceed 2000 characters."),

    reproductionSteps: z
      .string()
      .min(10, "Reproduction steps must be at least 10 characters.")
      .max(5000, "Reproduction steps must not exceed 5000 characters."),

    attachment: z
      .instanceof(File)
      .optional()
      .nullable()
      .refine(
        (file) => {
          if (!file) return true;
          return file.size <= MAX_FILE_SIZE_BYTES;
        },
        { message: `File size must not exceed ${MAX_FILE_SIZE_MB}MB.` }
      )
      .refine(
        (file) => {
          if (!file) return true;
          return ACCEPTED_FILE_TYPES.includes(file.type);
        },
        {
          message:
            "Invalid file type. Accepted: PNG, JPEG, GIF, WebP, PDF, MP4, WebM.",
        }
      ),

    externalLink: z
      .string()
      .optional()
      .refine(
        (url) => {
          if (!url) return true;
          try {
            new URL(url);
            return true;
          } catch {
            return false;
          }
        },
        { message: "Please enter a valid URL (e.g., https://drive.google.com/...)." }
      ),

    cannotProvideScreenshot: z.boolean(),
  })
  // ── Conditional Rules ──
  .superRefine((data, ctx) => {
    // RULE 1: If category is "UI/UX" (id: 2), attachment is MANDATORY
    if (data.categoryId === 2 && (!data.attachment || data.attachment === null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "A screenshot or attachment is strictly required for UI/UX issues.",
        path: ["attachment"],
      });
    }

    // RULE 2: If category is "Bug" (id: 1) and user checked "cannot provide screenshot",
    //         then reproduction steps must be ≥ 50 characters.
    if (
      data.categoryId === 1 &&
      data.cannotProvideScreenshot &&
      data.reproductionSteps.length < 50
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "When no screenshot is provided for a Bug, reproduction steps must be at least 50 characters to ensure clarity.",
        path: ["reproductionSteps"],
      });
    }
  });

export type IssueFormData = z.infer<typeof issueFormSchema>;
