import { z } from "zod";

export const createContributionSchema = z.object({
  amountEuros: z.coerce.number().nonnegative(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (AAAA-MM-JJ)."),
  provisionId: z.string().min(1),
});

export const updateContributionSchema = createContributionSchema.extend({
  id: z.string().min(1),
});

export const deleteContributionSchema = z.object({
  id: z.string().min(1),
});
