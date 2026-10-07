import { z } from "zod";

export const openMonthSchema = z.object({ incomeEuros: z.coerce.number().nonnegative() });

export const closeMonthSchema = z.object({
  allocations: z.array(
    z.object({
      destination: z.enum(["savings", "provision"]),
      provisionId: z.string(),
      amountEuros: z.coerce.number(),
    }),
  ),
});
