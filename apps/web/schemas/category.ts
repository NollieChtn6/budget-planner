import { z } from "zod";

/** The "none" sentinel is the Select's own value for "no default envelope" (Radix Select rejects an empty-string item value). */
export const NO_DEFAULT_ENVELOPE = "none";

export const createCategorySchema = z.object({
  label: z.string().trim().min(1),
  defaultEnvelopeId: z.string().min(1),
});

export const archiveCategorySchema = z.object({ categoryId: z.string().min(1) });

export const unarchiveCategorySchema = z.object({ categoryId: z.string().min(1) });
