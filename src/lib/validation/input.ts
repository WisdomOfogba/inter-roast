import { z } from "zod";
import { INTENSITIES } from "@/types/roast";
import { parseRedditHandle } from "./reddit-handle";

export const LIMITS = {
  bio: 400,
  content: 8000,
  context: 300,
  /** Minimum characters of bio + content combined before we'll roast. */
  minTotal: 40,
} as const;

export const roastRequestSchema = z
  .object({
    handle: z
      .string()
      .max(200)
      .optional()
      .transform((v, ctx) => {
        if (!v || !v.trim()) return null;
        const parsed = parseRedditHandle(v);
        if (!parsed.ok) {
          ctx.addIssue({ code: "custom", message: parsed.error });
          return z.NEVER;
        }
        return parsed.handle;
      }),
    bio: z
      .string()
      .max(LIMITS.bio, `Bio is capped at ${LIMITS.bio} characters.`)
      .optional()
      .default(""),
    content: z
      .string()
      .max(LIMITS.content, `Receipts are capped at ${LIMITS.content.toLocaleString("en-US")} characters.`)
      .optional()
      .default(""),
    context: z
      .string()
      .max(LIMITS.context, `Extra context is capped at ${LIMITS.context} characters.`)
      .optional()
      .default(""),
    intensity: z.enum(INTENSITIES),
    consent: z.literal(true, {
      error: "Confirm this is your content, or your friend is in on the joke.",
    }),
  })
  .superRefine((val, ctx) => {
    const total = (val.bio + val.content).replace(/\s+/g, " ").trim().length;
    if (total < LIMITS.minTotal) {
      ctx.addIssue({
        code: "custom",
        path: ["content"],
        message: `Give us at least ${LIMITS.minTotal} characters of posts, comments or bio. We can't roast a blank page (well, we could, but it'd be about you).`,
      });
    }
  });

export type RoastRequest = z.output<typeof roastRequestSchema>;
export type RoastRequestInput = z.input<typeof roastRequestSchema>;
