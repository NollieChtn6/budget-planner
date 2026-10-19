"use client";

import {
  type CalendarDate,
  formatCalendarDate,
  moneyToEuros,
  type Reimbursement,
} from "@budget/domain";
import { useActionState, useEffect, useState } from "react";
import { deleteReimbursementAction, updateReimbursementAction } from "@/actions/reimbursement";
import { initialReimbursementActionState } from "@/actions/reimbursement-state";
import { initialVariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import type { ExpenseLinkOption } from "@/lib/expense-link-options";
import { formatEuros } from "@/lib/format-money";
import { ReimbursementFields } from "./reimbursement-fields";

function formatDay(date: CalendarDate): string {
  return `${date.day.toString().padStart(2, "0")}/${date.month.toString().padStart(2, "0")}`;
}

export function ReimbursementRow({
  reimbursement,
  categoryLabel,
  categories,
  expenseOptions,
  minDate,
  maxDate,
  editable,
}: {
  reimbursement: Reimbursement;
  categoryLabel: string;
  categories: { id: string; label: string }[];
  expenseOptions: ExpenseLinkOption[];
  minDate: string;
  maxDate: string;
  editable: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [updateState, updateAction, updatePending] = useActionState(
    updateReimbursementAction,
    initialReimbursementActionState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteReimbursementAction,
    initialVariableEnvelopeActionState,
  );

  // Stay on the form when the save carries a warning (R35), so it can be read.
  useEffect(() => {
    if (updateState.status === "success" && !updateState.warning) {
      setIsEditing(false);
    }
  }, [updateState.status, updateState.warning]);

  if (!isEditing) {
    return (
      <li className="flex flex-col gap-1 border-b pb-2 last:border-b-0 last:pb-0">
        <div className="flex justify-between gap-2 text-sm">
          <span className="text-muted-foreground">{formatDay(reimbursement.date)}</span>
          <span className="flex-1">
            {reimbursement.label}
            <span className="text-muted-foreground"> · {categoryLabel}</span>
          </span>
          <span className="text-positive">+{formatEuros(moneyToEuros(reimbursement.amount))}</span>
        </div>
        {editable ? (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              Modifier
            </Button>
            <form action={deleteAction}>
              <input type="hidden" name="id" value={reimbursement.id} />
              <Button type="submit" variant="destructive" size="sm" disabled={deletePending}>
                {deletePending ? "Suppression..." : "Supprimer"}
              </Button>
            </form>
          </div>
        ) : null}
        {deleteState.status === "error" ? <FieldError>{deleteState.message}</FieldError> : null}
      </li>
    );
  }

  return (
    <li className="border-b pb-3 last:border-b-0 last:pb-0">
      <form action={updateAction}>
        <input type="hidden" name="id" value={reimbursement.id} />
        <FieldGroup>
          <ReimbursementFields
            idPrefix={`edit-reimbursement-${reimbursement.id}`}
            categories={categories}
            expenseOptions={expenseOptions}
            minDate={minDate}
            maxDate={maxDate}
            initial={{
              amountEuros: moneyToEuros(reimbursement.amount),
              label: reimbursement.label,
              date: formatCalendarDate(reimbursement.date),
              categoryId: reimbursement.categoryId,
              expenseId: reimbursement.expenseId,
            }}
          />
          {updateState.status === "error" ? <FieldError>{updateState.message}</FieldError> : null}
          {updateState.warning ? (
            <p className="rounded-md border border-l-4 border-l-alert-warning bg-card px-3 py-2 text-sm">
              {updateState.warning}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={updatePending}>
              {updatePending ? "Enregistrement..." : "Enregistrer"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)}>
              {updateState.warning ? "Fermer" : "Annuler"}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </li>
  );
}
