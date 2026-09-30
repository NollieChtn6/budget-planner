import { z } from "zod";

const monthChoiceSchema = z.enum(["current", "next"]);
const fixedEntryTypeSchema = z.enum(["charge", "scheduledSaving"]);

export const createFixedEntrySchema = z.object({
  label: z.string().trim().min(1),
  type: fixedEntryTypeSchema,
  amountEuros: z.coerce.number().nonnegative(),
  effectiveFrom: monthChoiceSchema,
});

export const addFixedEntryVersionSchema = z.object({
  fixedEntryId: z.string().min(1),
  amountEuros: z.coerce.number().nonnegative(),
  effectiveFrom: monthChoiceSchema,
});

export const archiveFixedEntrySchema = z.object({
  fixedEntryId: z.string().min(1),
  effectiveFrom: monthChoiceSchema,
});

export const unarchiveFixedEntrySchema = z.object({ fixedEntryId: z.string().min(1) });
