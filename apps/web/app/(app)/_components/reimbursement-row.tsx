"use client";

import { formatCalendarDate, moneyToEuros, type Reimbursement } from "@budget/domain";
import { useActionState, useEffect, useState } from "react";
import { deleteReimbursementAction, updateReimbursementAction } from "@/actions/reimbursement";
import { initialReimbursementActionState } from "@/actions/reimbursement-state";
import { initialVariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { TableCell, TableRow } from "@/components/ui/table";
import type { ExpenseLinkOption } from "@/lib/expense-link-options";
import { formatEuros } from "@/lib/format-money";
import {
  AmountCell,
  CategoryTag,
  formatDay,
  MutedText,
  OPERATION_EDIT_FULL_WIDTH_CLASS,
  OPERATION_EDIT_GRID_CLASS,
  OperationActions,
  OperationEditRow,
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

  if (!isEditing) {
    return (
      <TableRow>
        <TableCell className="tabular-nums">{formatDay(reimbursement.date)}</TableCell>
        <TableCell>
          <MutedText>Remboursement</MutedText>
        </TableCell>
        <TableCell className="min-w-40 whitespace-normal">{reimbursement.label}</TableCell>
        <TableCell>{category ? <CategoryTag {...category} /> : null}</TableCell>
        <TableCell>
          <MutedText>Reste à vivre</MutedText>
        </TableCell>
        <AmountCell incoming>{formatEuros(moneyToEuros(reimbursement.amount))}</AmountCell>
        {editable ? (
          <OperationActions
            id={reimbursement.id}
            onEdit={() => setIsEditing(true)}
            deleteAction={deleteAction}
            deletePending={deletePending}
            error={deleteState.status === "error" ? deleteState.message : undefined}
          />
        ) : null}
      </TableRow>
    );
  }

  return (
    <OperationEditRow>
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
              className={`rounded-md border border-l-4 border-l-alert-warning bg-card px-3 py-2 text-sm ${OPERATION_EDIT_FULL_WIDTH_CLASS}`}
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
    </OperationEditRow>
  );
}
