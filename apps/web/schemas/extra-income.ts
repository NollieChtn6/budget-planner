import { z } from "zod";

export const createExtraIncomeSchema = z.object({
  amountEuros: z.coerce.number().nonnegative(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (AAAA-MM-JJ)."),
  label: z.string().trim().min(1, "Saisis un libellé."),
});

export const updateExtraIncomeSchema = createExtraIncomeSchema.extend({
  id: z.string().min(1),
});

export const deleteExtraIncomeSchema = z.object({
  id: z.string().min(1),
});
