import type { VariableEnvelopeActionState } from "@/actions/variable-envelope-state";

export type OperationActionState = VariableEnvelopeActionState & {
  /** R37: set when the disposable income is negative after the operation. Never blocks the save. */
  warning?: string;
};

export const initialOperationActionState: OperationActionState = { status: "idle" };
