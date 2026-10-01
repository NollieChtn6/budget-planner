import { z } from "zod";

export const openMonthSchema = z.object({ incomeEuros: z.coerce.number().nonnegative() });
