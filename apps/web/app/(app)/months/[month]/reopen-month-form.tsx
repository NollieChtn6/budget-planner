"use client";

import { useActionState } from "react";
import { reopenMonthAction } from "@/actions/month";
import { initialVariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";

export function ReopenMonthForm() {
  const [state, formAction, pending] = useActionState(
    reopenMonthAction,
    initialVariableEnvelopeActionState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      {state.status === "error" ? <FieldError>{state.message}</FieldError> : null}
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Réouverture..." : "Rouvrir ce mois pour corriger"}
      </Button>
    </form>
  );
}
