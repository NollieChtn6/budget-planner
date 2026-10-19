import type { VariableEnvelopeActionState } from "@/actions/variable-envelope-state";

export type ReimbursementActionState = VariableEnvelopeActionState & {
  /** R35: set when the reimbursements linked to the expense now exceed its amount. Never blocks the save. */
  warning?: string;
};

export const initialReimbursementActionState: ReimbursementActionState = { status: "idle" };
