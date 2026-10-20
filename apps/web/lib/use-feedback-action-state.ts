"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

type FeedbackState = { status: "idle" | "error" | "success"; message?: string; warning?: string };

/**
 * `useActionState` that confirms a success with a toast. Errors stay inline, next to the field that
 * caused them. A success carrying a warning (R37) is left to the form, which keeps it readable.
 */
export function useFeedbackActionState<State extends FeedbackState>(
  action: (state: Awaited<State>, payload: FormData) => State | Promise<State>,
  initialState: Awaited<State>,
) {
  const result = useActionState(action, initialState);
  const [state] = result;

  useEffect(() => {
    if (state.status === "success" && state.message && !state.warning) {
      toast.success(state.message);
    }
  }, [state]);

  return result;
}
