import { describe, expect, it } from "vitest";
import { createExpenseSchema } from "@/schemas/expense";
import { createProvisionSchema } from "@/schemas/provision";
import { describeInvalidInput } from "./describe-invalid-input";

const valid = {
  amountEuros: "12.5",
  date: "2026-10-12",
  categoryId: "c1",
  target: "envelope:e1",
};

function describeFailure(schema: typeof createExpenseSchema, input: Record<string, unknown>) {
  const result = schema.safeParse(input);
  if (result.success) throw new Error("expected a failure");
  return describeInvalidInput(result.error);
}

describe("describeInvalidInput", () => {
  it("words a non-numeric amount without Zod's own message", () => {
    expect(describeFailure(createExpenseSchema, { ...valid, amountEuros: "abc" })).toBe(
      "Saisis un montant valide, par exemple 12,50.",
    );
  });

  it("words a negative amount", () => {
    expect(describeFailure(createExpenseSchema, { ...valid, amountEuros: "-3" })).toBe(
      "Le montant ne peut pas être négatif.",
    );
  });

  it("words a malformed date", () => {
    expect(describeFailure(createExpenseSchema, { ...valid, date: "12/10" })).toBe(
      "Choisis une date valide.",
    );
  });

  it("words a missing field, which Zod reports in English by default", () => {
    expect(describeFailure(createExpenseSchema, { ...valid, categoryId: undefined })).toBe(
      "Choisis une catégorie.",
    );
  });

  it("reaches a field nested in a union", () => {
    const result = createProvisionSchema.safeParse({
      label: "Vacances",
      targetEuros: "500",
      type: "reserve",
      monthlyAmountEuros: "0",
    });
    if (result.success) throw new Error("expected a failure");
    expect(describeInvalidInput(result.error)).toBe("Saisis un montant mensuel supérieur à 0 €.");
  });
});
