"use client";

import { useActionState, useState } from "react";
import { createExtraIncomeAction } from "@/actions/extra-income";
import { initialOperationActionState } from "@/actions/operation-state";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { ExtraIncomeFields } from "./extra-income-fields";

/**
 * R36. Once saved, the dialog stays on a confirmation so the amount can be
 * moved straight to savings (`onTransfer`): the transfer is a separate
 * operation (R37), this is only a shortcut to its form.
 */
export function AddExtraIncomeForm({
  minDate,
  maxDate,
  defaultDate,
  onTransfer,
  onClose,
}: {
  minDate: string;
  maxDate: string;
  defaultDate: string;
  onTransfer: (amountEuros: number) => void;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    createExtraIncomeAction,
    initialOperationActionState,
  );
  const [amountEuros, setAmountEuros] = useState(Number.NaN);

  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{state.message}</p>
        <Button type="button" variant="accent" onClick={() => onTransfer(amountEuros)}>
          Transférer vers l'épargne
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Fermer
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <FieldGroup>
        <ExtraIncomeFields
          idPrefix="extra-income"
          minDate={minDate}
          maxDate={maxDate}
          initial={{ date: defaultDate }}
          onAmountChange={setAmountEuros}
        />
        {state.status === "error" ? <FieldError>{state.message}</FieldError> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Ajout..." : "Ajouter l'entrée"}
        </Button>
      </FieldGroup>
    </form>
  );
}
