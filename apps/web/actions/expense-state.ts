import type { VariableEnvelopeActionState } from "@/actions/variable-envelope-state";

export type ExpenseActionState = VariableEnvelopeActionState & {
  /** R23: set when this expense just emptied a deadline provision, prompting Clôturer/Renouveler/Conserver. */
  provisionExhausted?: { provisionId: string; label: string };
};

export const initialExpenseActionState: ExpenseActionState = { status: "idle" };
