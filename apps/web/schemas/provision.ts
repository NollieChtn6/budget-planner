import { z } from "zod";

const monthChoiceSchema = z.enum(["current", "next"]);
const monthValueSchema = z.string().regex(/^\d{4}-\d{2}$/, "Mois invalide (AAAA-MM).");

const deadlineFieldsSchema = z.object({
  type: z.literal("deadline"),
  startMonth: monthValueSchema,
  durationMonths: z.coerce.number().int().positive(),
});
const reserveFieldsSchema = z.object({
  type: z.literal("reserve"),
  monthlyAmountEuros: z.coerce.number().positive(),
});

export const createProvisionSchema = z
  .object({ label: z.string().trim().min(1), targetEuros: z.coerce.number().positive() })
  .and(z.discriminatedUnion("type", [deadlineFieldsSchema, reserveFieldsSchema]));

export const updateProvisionGoalSchema = z
  .object({ provisionId: z.string().min(1), targetEuros: z.coerce.number().positive() })
  .and(
    z.discriminatedUnion("type", [
      z.object({ type: z.literal("deadline"), durationMonths: z.coerce.number().int().positive() }),
      z.object({ type: z.literal("reserve"), monthlyAmountEuros: z.coerce.number().positive() }),
    ]),
  );

export const archiveProvisionSchema = z.object({
  provisionId: z.string().min(1),
  effectiveFrom: monthChoiceSchema,
});

export const unarchiveProvisionSchema = z.object({ provisionId: z.string().min(1) });

export const closeProvisionSchema = z.object({ provisionId: z.string().min(1) });

export const renewProvisionSchema = z.object({ provisionId: z.string().min(1) });
