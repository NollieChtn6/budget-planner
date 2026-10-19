import { z } from "zod";

/** The "Dépense d'origine" select sends "none" when no expense is linked (R35). */
const expenseIdSchema = z
  .string()
  .optional()
  .transform((value) => (value && value !== "none" ? value : undefined));

export const createReimbursementSchema = z.object({
  amountEuros: z.coerce.number().nonnegative(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (AAAA-MM-JJ)."),
  label: z.string().trim().min(1, "Saisis un libellé."),
  categoryId: z.string().min(1),
  expenseId: expenseIdSchema,
});

export const updateReimbursementSchema = createReimbursementSchema.extend({
  id: z.string().min(1),
});

export const deleteReimbursementSchema = z.object({
  id: z.string().min(1),
});
