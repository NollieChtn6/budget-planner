export type ProfileActionState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export const initialProfileActionState: ProfileActionState = { status: "idle" };
