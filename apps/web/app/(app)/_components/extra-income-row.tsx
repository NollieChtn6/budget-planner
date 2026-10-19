"use client";

import { type ExtraIncome, formatCalendarDate, moneyToEuros } from "@budget/domain";
import { useActionState, useEffect, useState } from "react";
import { deleteExtraIncomeAction, updateExtraIncomeAction } from "@/actions/extra-income";
import { initialOperationActionState } from "@/actions/operation-state";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatEuros } from "@/lib/format-money";
import { ExtraIncomeFields } from "./extra-income-fields";
import {
  AmountCell,
  formatDay,
  MutedText,
  OPERATION_EDIT_FULL_WIDTH_CLASS,
  OPERATION_EDIT_GRID_CLASS,
  OperationActions,
  OperationEditRow,
} from "./operation-table-parts";

export function ExtraIncomeRow({
  extraIncome,
  minDate,
  maxDate,
  editable,
}: {
  extraIncome: ExtraIncome;
  minDate: string;
  maxDate: string;
  editable: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [updateState, updateAction, updatePending] = useActionState(
    updateExtraIncomeAction,
    initialOperationActionState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteExtraIncomeAction,
    initialOperationActionState,
  );

  useEffect(() => {
    if (updateState.status === "success") {
      setIsEditing(false);
    }
  }, [updateState.status]);

  if (!isEditing) {
    return (
      <TableRow>
        <TableCell className="tabular-nums">{formatDay(extraIncome.date)}</TableCell>
        <TableCell>
          <MutedText>Entrée exceptionnelle</MutedText>
        </TableCell>
        <TableCell className="min-w-40 whitespace-normal">{extraIncome.label}</TableCell>
        <TableCell />
        <TableCell>
          <MutedText>Reste à vivre</MutedText>
        </TableCell>
        <AmountCell incoming>{formatEuros(moneyToEuros(extraIncome.amount))}</AmountCell>
        {editable ? (
          <OperationActions
            id={extraIncome.id}
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
        <input type="hidden" name="id" value={extraIncome.id} />
        <FieldGroup className={OPERATION_EDIT_GRID_CLASS}>
          <ExtraIncomeFields
            idPrefix={`edit-extra-income-${extraIncome.id}`}
            minDate={minDate}
            maxDate={maxDate}
            initial={{
              amountEuros: moneyToEuros(extraIncome.amount),
              label: extraIncome.label,
              date: formatCalendarDate(extraIncome.date),
            }}
          />
          {updateState.status === "error" ? (
            <FieldError className={OPERATION_EDIT_FULL_WIDTH_CLASS}>
              {updateState.message}
            </FieldError>
          ) : null}
          <div className={`flex gap-2 ${OPERATION_EDIT_FULL_WIDTH_CLASS}`}>
            <Button type="submit" size="sm" disabled={updatePending}>
              {updatePending ? "Enregistrement..." : "Enregistrer"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)}>
              Annuler
            </Button>
          </div>
        </FieldGroup>
      </form>
    </OperationEditRow>
  );
}
