export type SetupActionState = {
  status: "idle" | "error";
  message?: string;
};

export const initialSetupActionState: SetupActionState = { status: "idle" };
