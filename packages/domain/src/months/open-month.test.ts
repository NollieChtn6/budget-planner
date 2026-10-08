import { describe, expect, it } from "vitest";
import type { FixedEntry } from "../budget/fixed-entry";
import type { VariableEnvelope } from "../budget/variable-envelope";
import { type Money, moneyFromEuros, moneyToCents } from "../money";
import { parseMonth } from "../month";
import type { Provision } from "../provisions/provision";
import { openMonth } from "./open-month";

const month = parseMonth("2026-01");

function expectDefined<T>(value: T | undefined): T {
  expect(value).toBeDefined();
  return value as T;
}

function charges(): FixedEntry {
  return {
    id: "charges",
    label: "Charges",
    type: "charge",
    versions: [{ fixedEntryId: "charges", effectiveFrom: month, amount: moneyFromEuros(1400) }],
  };
}

function scheduledSaving(): FixedEntry {
  return {
    id: "epargne",
    label: "Épargne programmée",
    type: "scheduledSaving",
    versions: [{ fixedEntryId: "epargne", effectiveFrom: month, amount: moneyFromEuros(400) }],
  };
}

function referenceEnvelopes(): [VariableEnvelope, VariableEnvelope, VariableEnvelope] {
  return [
    {
      id: "vie-quotidienne",
      label: "Vie quotidienne",
      versions: [
        {
          envelopeId: "vie-quotidienne",
          effectiveFrom: month,
          mode: "amount",
          value: moneyFromEuros(150),
        },
      ],
    },
    {
      id: "sorties",
      label: "Sorties et loisirs",
      versions: [{ envelopeId: "sorties", effectiveFrom: month, mode: "percentage", value: 15 }],
    },
    {
      id: "plaisir",
      label: "Achats plaisir",
      versions: [{ envelopeId: "plaisir", effectiveFrom: month, mode: "percentage", value: 15 }],
    },
  ];
}

type ReferenceProvision = Provision & { balance: Money };

function referenceProvisions(): [ReferenceProvision, ReferenceProvision, ReferenceProvision] {
  return [
    {
      id: "orthodontie",
      label: "Orthodontie",
      type: "deadline",
      target: moneyFromEuros(400),
      startMonth: month,
      durationMonths: 6,
      status: "active",
      balance: moneyFromEuros(0),
    },
    {
      id: "vacances",
      label: "Vacances",
      type: "deadline",
      target: moneyFromEuros(700),
      startMonth: month,
      durationMonths: 10,
      status: "active",
      balance: moneyFromEuros(0),
    },
    {
      id: "imprevus",
      label: "Imprévus",
      type: "reserve",
      target: moneyFromEuros(250),
      monthlyAmount: moneyFromEuros(50),
      status: "active",
      balance: moneyFromEuros(0),
    },
  ];
}

function referenceInput() {
  return {
    month,
    income: moneyFromEuros(2800),
    previousMonthStatus: "none" as const,
    fixedEntries: [charges(), scheduledSaving()],
    envelopes: referenceEnvelopes(),
    provisions: referenceProvisions(),
  };
}

describe("openMonth — rules.md reference example (E1-E4)", () => {
  it("freezes fixed entries as planned (R5, R27)", () => {
    const result = openMonth(referenceInput());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.budgetMonth.fixedEntries).toHaveLength(2);
    for (const entry of result.budgetMonth.fixedEntries) {
      expect(entry.status).toBe("planned");
    }
  });

  it("computes disposable income (E1: 1 000€)", () => {
    const result = openMonth(referenceInput());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(moneyToCents(result.derived.disposableIncome)).toBe(moneyToCents(moneyFromEuros(1000)));
  });

  it("computes envelope budgets and unallocated (E2)", () => {
    const result = openMonth(referenceInput());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const byId = new Map(
      result.budgetMonth.envelopeBudgets.map((entry) => [entry.envelopeId, entry]),
    );
    expect(moneyToCents(expectDefined(byId.get("vie-quotidienne")).budget)).toBe(
      moneyToCents(moneyFromEuros(150)),
    );
    expect(moneyToCents(expectDefined(byId.get("sorties")).budget)).toBe(
      moneyToCents(moneyFromEuros(127.5)),
    );
    expect(moneyToCents(expectDefined(byId.get("plaisir")).budget)).toBe(
      moneyToCents(moneyFromEuros(127.5)),
    );
    expect(moneyToCents(result.derived.allocationBase)).toBe(moneyToCents(moneyFromEuros(850)));
    expect(moneyToCents(result.derived.unallocated)).toBe(moneyToCents(moneyFromEuros(595)));
  });

  it("computes provision targets at the first month (E3)", () => {
    const result = openMonth(referenceInput());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const byId = new Map(
      result.budgetMonth.provisionTargets.map((entry) => [entry.provisionId, entry]),
    );
    expect(moneyToCents(expectDefined(byId.get("orthodontie")).target)).toBe(6667);
    expect(moneyToCents(expectDefined(byId.get("vacances")).target)).toBe(7000);
  });

  it("computes the forecast margin, reserves included (E4: 408,33€)", () => {
    const result = openMonth(referenceInput());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(moneyToCents(result.derived.forecastMargin)).toBe(moneyToCents(moneyFromEuros(408.33)));
  });
});

describe("openMonth — R4", () => {
  it("rejects opening when the previous month is still open", () => {
    const result = openMonth({ ...referenceInput(), previousMonthStatus: "open" });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.type).toBe("previousMonthNotClosed");
  });

  it("allows opening when the previous month is closed", () => {
    const result = openMonth({ ...referenceInput(), previousMonthStatus: "closed" });
    expect(result.ok).toBe(true);
  });

  it("allows opening when the previous month never existed", () => {
    const result = openMonth({ ...referenceInput(), previousMonthStatus: "none" });
    expect(result.ok).toBe(true);
  });
});

describe("openMonth — R8", () => {
  it("omits a fixed entry archived before this month", () => {
    const archived: FixedEntry = { ...charges(), archivedFrom: month };
    const result = openMonth({ ...referenceInput(), fixedEntries: [archived, scheduledSaving()] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.budgetMonth.fixedEntries.map((entry) => entry.fixedEntryId)).not.toContain(
      "charges",
    );
  });

  it("omits an envelope archived before this month", () => {
    const [vieQuotidienne, sorties, plaisir] = referenceEnvelopes();
    const archived: VariableEnvelope = { ...vieQuotidienne, archivedFrom: month };
    const result = openMonth({ ...referenceInput(), envelopes: [archived, sorties, plaisir] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.budgetMonth.envelopeBudgets.map((entry) => entry.envelopeId)).not.toContain(
      "vie-quotidienne",
    );
  });

  it("omits a provision archived before this month", () => {
    const [orthodontie, vacances, imprevus] = referenceProvisions();
    const archived = { ...orthodontie, archivedFrom: month };
    const result = openMonth({ ...referenceInput(), provisions: [archived, vacances, imprevus] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.budgetMonth.provisionTargets.map((entry) => entry.provisionId)).not.toContain(
      "orthodontie",
    );
  });

  it("omits a provision closed by R23", () => {
    const [orthodontie, vacances, imprevus] = referenceProvisions();
    const closed = { ...orthodontie, status: "closed" as const };
    const result = openMonth({ ...referenceInput(), provisions: [closed, vacances, imprevus] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.budgetMonth.provisionTargets.map((entry) => entry.provisionId)).not.toContain(
      "orthodontie",
    );
  });
});

describe("openMonth — R13", () => {
  it("zeroes percentage envelopes and signals the gap when the allocation base is negative", () => {
    const input = {
      ...referenceInput(),
      fixedEntries: [charges(), scheduledSaving()],
      income: moneyFromEuros(1500),
      envelopes: [
        {
          ...referenceEnvelopes()[0],
          versions: [
            {
              envelopeId: "vie-quotidienne",
              effectiveFrom: month,
              mode: "amount" as const,
              value: moneyFromEuros(200),
            },
          ],
        },
        referenceEnvelopes()[1],
        referenceEnvelopes()[2],
      ],
    };
    // disposableIncome = 1500 - 1800 = -300 ; allocationBase = -300 - 200 = -500
    const result = openMonth(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.derived.allocationBaseNegative).toBe(true);
    const percentageBudgets = result.budgetMonth.envelopeBudgets.filter(
      (entry) => entry.mode === "percentage",
    );
    for (const entry of percentageBudgets) {
      expect(moneyToCents(entry.budget)).toBe(0);
    }
  });
});
