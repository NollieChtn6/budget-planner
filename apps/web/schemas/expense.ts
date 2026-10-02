import { z } from "zod";

export const createExpenseSchema = z.object({
  amountEuros: z.coerce.number().nonnegative(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (AAAA-MM-JJ)."),
  categoryId: z.string().min(1),
  envelopeId: z.string().min(1),
  place: z.string().trim().optional(),
  description: z.string().trim().optional(),
});
