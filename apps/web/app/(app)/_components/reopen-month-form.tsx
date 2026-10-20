"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { reopenMonthAction } from "@/actions/month";
import { initialVariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { useFeedbackActionState } from "@/lib/use-feedback-action-state";

/** @param redirectTo Where to send the user once reopened, e.g. "/" from a history detail page that no longer applies once the month is open again. Omit to stay put. */
export function ReopenMonthForm({ redirectTo }: { redirectTo?: string } = {}) {
  const router = useRouter();
  const [state, formAction, pending] = useFeedbackActionState(
    reopenMonthAction,
    initialVariableEnvelopeActionState,
  );

  useEffect(() => {
    if (state.status === "success" && redirectTo) {
      router.push(redirectTo);
    }
  }, [state.status, redirectTo, router]);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      {state.status === "error" ? <FieldError>{state.message}</FieldError> : null}
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Réouverture..." : "Rouvrir ce mois pour corriger"}
      </Button>
    </form>
  );
}
