import { z } from "zod";

/** The "Imputer à" select's value: "envelope:<id>" or "provision:<id>". */
export const createExpenseSchema = z.object({
  amountEuros: z.coerce.number().nonnegative(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (AAAA-MM-JJ)."),
  categoryId: z.string().min(1),
  target: z.string().regex(/^(envelope|provision):.+$/, "Choisis une enveloppe ou une provision."),
  place: z.string().trim().optional(),
  description: z.string().trim().optional(),
});
