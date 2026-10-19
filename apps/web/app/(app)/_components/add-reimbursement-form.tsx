"use client";

import { useActionState, useEffect } from "react";
import { createReimbursementAction } from "@/actions/reimbursement";
import { initialReimbursementActionState } from "@/actions/reimbursement-state";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import type { ExpenseLinkOption } from "@/lib/expense-link-options";
import { ReimbursementFields } from "./reimbursement-fields";

export function AddReimbursementForm({
  categories,
  expenseOptions,
  lastUsedCategoryId,
  minDate,
  maxDate,
  defaultDate,
  onSuccess,
}: {
  categories: { id: string; label: string }[];
  expenseOptions: ExpenseLinkOption[];
  lastUsedCategoryId: string | null;
  minDate: string;
  maxDate: string;
  defaultDate: string;
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    createReimbursementAction,
    initialReimbursementActionState,
  );
  // A warning (R35) must stay readable, so the dialog only closes on its own for a clean success.
  useEffect(() => {
    if (state.status === "success" && !state.warning) {
      onSuccess?.();
    }
  }, [state.status, state.warning, onSuccess]);

  return (
    <form action={formAction}>
      <FieldGroup>
        <ReimbursementFields
          idPrefix="reimbursement"
          categories={categories}
          expenseOptions={expenseOptions}
          minDate={minDate}
          maxDate={maxDate}
          initial={{
            date: defaultDate,
            categoryId:
              lastUsedCategoryId && categories.some((c) => c.id === lastUsedCategoryId)
                ? lastUsedCategoryId
                : undefined,
          }}
        />
        {state.status === "error" ? <FieldError>{state.message}</FieldError> : null}
        {state.status === "success" ? (
          <p className="text-sm text-muted-foreground">{state.message}</p>
        ) : null}
        {state.warning ? (
          <p className="rounded-md border border-alert-warning/60 bg-card px-3 py-2 text-sm">
            {state.warning}
          </p>
        ) : null}
        {state.warning ? (
          <Button type="button" variant="outline" onClick={() => onSuccess?.()}>
            Fermer
          </Button>
        ) : (
          <Button type="submit" disabled={pending}>
            {pending ? "Ajout..." : "Ajouter le remboursement"}
          </Button>
        )}
      </FieldGroup>
    </form>
  );
}
