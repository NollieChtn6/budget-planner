"use client";

import { formatCalendarDate, moneyToEuros, type Reimbursement } from "@budget/domain";
import { useActionState, useEffect, useState } from "react";
import { deleteReimbursementAction, updateReimbursementAction } from "@/actions/reimbursement";
import { initialReimbursementActionState } from "@/actions/reimbursement-state";
import { initialVariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import type { ExpenseLinkOption } from "@/lib/expense-link-options";
import { formatEuros } from "@/lib/format-money";
import {
  CategoryTag,
  MutedText,
  OPERATION_EDIT_FULL_WIDTH_CLASS,
  OPERATION_EDIT_GRID_CLASS,
  OperationReadRow,
  OperationRow,
} from "./operation-table-parts";
import { ReimbursementFields } from "./reimbursement-fields";

export function ReimbursementRow({
  reimbursement,
  category,
  categories,
  expenseOptions,
  minDate,
  maxDate,
  editable,
}: {
  reimbursement: Reimbursement;
  category: { label: string; color: string } | undefined;
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

  const deletion = {
    id: reimbursement.id,
    action: deleteAction,
    pending: deletePending,
    error: deleteState.status === "error" ? deleteState.message : undefined,
  };
  const read = (
    <OperationReadRow
      date={reimbursement.date}
      target={<MutedText>Reste à vivre</MutedText>}
      place={<MutedText>Remboursement</MutedText>}
      description={reimbursement.label}
      category={category ? <CategoryTag {...category} /> : null}
      amount={formatEuros(moneyToEuros(reimbursement.amount))}
      incoming
      editable={editable}
      editLabel={`Modifier le remboursement ${reimbursement.label}`}
      edit={{ onEdit: () => setIsEditing(true), delete: deletion }}
    />
  );

  return (
    <OperationRow
      isEditing={isEditing}
      onClose={() => setIsEditing(false)}
      title="Modifier le remboursement"
      read={read}
      deletion={deletion}
    >
      <form action={updateAction}>
        <input type="hidden" name="id" value={reimbursement.id} />
        <FieldGroup className={OPERATION_EDIT_GRID_CLASS}>
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
          {updateState.status === "error" ? (
            <FieldError className={OPERATION_EDIT_FULL_WIDTH_CLASS}>
              {updateState.message}
            </FieldError>
          ) : null}
          {updateState.warning ? (
            <p
              className={`rounded-md border border-alert-warning/60 bg-card px-3 py-2 text-sm ${OPERATION_EDIT_FULL_WIDTH_CLASS}`}
            >
              {updateState.warning}
            </p>
          ) : null}
          <div className={`flex gap-2 ${OPERATION_EDIT_FULL_WIDTH_CLASS}`}>
            <Button type="submit" size="sm" disabled={updatePending}>
              {updatePending ? "Enregistrement..." : "Enregistrer"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)}>
              {updateState.warning ? "Fermer" : "Annuler"}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </OperationRow>
  );
}
