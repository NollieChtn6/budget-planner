"use client";

import {
  formatCalendarDate,
  moneyToEuros,
  type SavingsTransfer,
  type SavingsTransferKind,
} from "@budget/domain";
import { useActionState, useEffect, useState } from "react";
import { initialOperationActionState } from "@/actions/operation-state";
import {
  deleteSavingsTransferAction,
  updateSavingsTransferAction,
} from "@/actions/savings-transfer";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatEuros } from "@/lib/format-money";
import {
  AmountCell,
  formatDay,
  MutedText,
  OPERATION_EDIT_FULL_WIDTH_CLASS,
  OPERATION_EDIT_GRID_CLASS,
  OperationActions,
  OperationEditRow,
} from "./operation-table-parts";
import { SavingsTransferFields } from "./savings-transfer-fields";

export function SavingsTransferRow({
  savingsTransfer,
  minDate,
  maxDate,
  editable,
}: {
  savingsTransfer: SavingsTransfer;
  minDate: string;
  maxDate: string;
  editable: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [kind, setKind] = useState<SavingsTransferKind>(savingsTransfer.kind);
  const [updateState, updateAction, updatePending] = useActionState(
    updateSavingsTransferAction,
    initialOperationActionState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteSavingsTransferAction,
    initialOperationActionState,
  );

  // Stay on the form when the save carries a warning (R37), so it can be read.
  useEffect(() => {
    if (updateState.status === "success" && !updateState.warning) {
      setIsEditing(false);
    }
  }, [updateState.status, updateState.warning]);

  if (!isEditing) {
    return (
      <TableRow>
        <TableCell className="tabular-nums">{formatDay(savingsTransfer.date)}</TableCell>
        <TableCell>
          {savingsTransfer.kind === "convertedUrge" ? (
            <span className="text-positive">
              <span aria-hidden>✨ </span>
              Envie convertie
            </span>
          ) : (
            <MutedText>Transfert</MutedText>
          )}
        </TableCell>
        <TableCell className="min-w-40 whitespace-normal">{savingsTransfer.label ?? ""}</TableCell>
        <TableCell />
        <TableCell>Épargne</TableCell>
        <AmountCell incoming={false}>
          {formatEuros(moneyToEuros(savingsTransfer.amount))}
        </AmountCell>
        {editable ? (
          <OperationActions
            id={savingsTransfer.id}
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
        <input type="hidden" name="id" value={savingsTransfer.id} />
        <FieldGroup className={OPERATION_EDIT_GRID_CLASS}>
          <SavingsTransferFields
            idPrefix={`edit-savings-transfer-${savingsTransfer.id}`}
            minDate={minDate}
            maxDate={maxDate}
            kind={kind}
            onKindChange={setKind}
            initial={{
              amountEuros: moneyToEuros(savingsTransfer.amount),
              label: savingsTransfer.label,
              date: formatCalendarDate(savingsTransfer.date),
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setKind(savingsTransfer.kind);
                setIsEditing(false);
              }}
            >
              {updateState.warning ? "Fermer" : "Annuler"}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </OperationEditRow>
  );
}
