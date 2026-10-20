"use client";

import type { SavingsTransferKind } from "@budget/domain";
import { useEffect } from "react";
import { initialOperationActionState } from "@/actions/operation-state";
import { createSavingsTransferAction } from "@/actions/savings-transfer";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { useFeedbackActionState } from "@/lib/use-feedback-action-state";
import { SavingsTransferFields } from "./savings-transfer-fields";

export function AddSavingsTransferForm({
  minDate,
  maxDate,
  defaultDate,
  defaultAmountEuros,
  kind = "free",
  onClose,
}: {
  minDate: string;
  maxDate: string;
  defaultDate: string;
  defaultAmountEuros?: number;
  kind?: SavingsTransferKind;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useFeedbackActionState(
    createSavingsTransferAction,
    initialOperationActionState,
  );

  // A warning (R37) must stay readable, so the dialog only closes on its own for a clean success.
  useEffect(() => {
    if (state.status === "success" && !state.warning) onClose();
  }, [state, onClose]);

  if (state.status === "success" && state.warning) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{state.message}</p>
        <p className="rounded-md border border-alert-warning/60 bg-card px-3 py-2 text-sm">
          {state.warning}
        </p>
        <Button type="button" variant="outline" onClick={onClose}>
          Fermer
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <FieldGroup>
        <SavingsTransferFields
          idPrefix="savings-transfer"
          minDate={minDate}
          maxDate={maxDate}
          kind={kind}
          initial={{
            date: defaultDate,
            amountEuros: Number.isFinite(defaultAmountEuros) ? defaultAmountEuros : undefined,
          }}
        />
        {state.status === "error" ? <FieldError>{state.message}</FieldError> : null}
        <Button type="submit" variant="accent" disabled={pending}>
          {pending
            ? "Ajout..."
            : kind === "convertedUrge"
              ? "Convertir l'envie en épargne"
              : "Transférer vers l'épargne"}
        </Button>
      </FieldGroup>
    </form>
  );
}
