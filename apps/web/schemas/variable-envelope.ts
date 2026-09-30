import { z } from "zod";

const monthChoiceSchema = z.enum(["current", "next"]);

const modeAndValueSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("amount"), amountEuros: z.coerce.number().nonnegative() }),
  z.object({
    mode: z.literal("percentage"),
    percentage: z.coerce.number().int().nonnegative().max(100),
  }),
]);

export const createVariableEnvelopeSchema = z
  .object({ label: z.string().trim().min(1), effectiveFrom: monthChoiceSchema })
  .and(modeAndValueSchema);

export const addVariableEnvelopeVersionSchema = z
  .object({ envelopeId: z.string().min(1), effectiveFrom: monthChoiceSchema })
  .and(modeAndValueSchema);

export const archiveVariableEnvelopeSchema = z.object({
  envelopeId: z.string().min(1),
  effectiveFrom: monthChoiceSchema,
});

export const unarchiveVariableEnvelopeSchema = z.object({ envelopeId: z.string().min(1) });
