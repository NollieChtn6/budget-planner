export type VariableEnvelopeActionState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export const initialVariableEnvelopeActionState: VariableEnvelopeActionState = { status: "idle" };
