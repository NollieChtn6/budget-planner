import { z } from "zod";

export const createSavingsTransferSchema = z.object({
  amountEuros: z.coerce.number().nonnegative(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (AAAA-MM-JJ)."),
  kind: z.enum(["free", "convertedUrge"]).default("free"),
  label: z.string().trim().optional(),
});

export const updateSavingsTransferSchema = createSavingsTransferSchema.extend({
  id: z.string().min(1),
});

export const deleteSavingsTransferSchema = z.object({
  id: z.string().min(1),
});
