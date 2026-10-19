"use client";

import {
  type CalendarDate,
  formatCalendarDate,
  moneyToEuros,
  type SavingsTransfer,
} from "@budget/domain";
import { useActionState, useEffect, useState } from "react";
import { initialOperationActionState } from "@/actions/operation-state";
import {
  deleteSavingsTransferAction,
  updateSavingsTransferAction,
} from "@/actions/savings-transfer";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { formatEuros } from "@/lib/format-money";
import { SavingsTransferFields } from "./savings-transfer-fields";

function formatDay(date: CalendarDate): string {
  return `${date.day.toString().padStart(2, "0")}/${date.month.toString().padStart(2, "0")}`;
}

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
      <li className="flex flex-col gap-1 border-b pb-2 last:border-b-0 last:pb-0">
        <div className="flex justify-between gap-2 text-sm">
          <span className="text-muted-foreground">{formatDay(savingsTransfer.date)}</span>
          <span className="flex-1">{savingsTransfer.label ?? "Épargne"}</span>
          <span>{formatEuros(moneyToEuros(savingsTransfer.amount))}</span>
        </div>
        {editable ? (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              Modifier
            </Button>
            <form action={deleteAction}>
              <input type="hidden" name="id" value={savingsTransfer.id} />
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
        <input type="hidden" name="id" value={savingsTransfer.id} />
        <FieldGroup>
          <SavingsTransferFields
            idPrefix={`edit-savings-transfer-${savingsTransfer.id}`}
            minDate={minDate}
            maxDate={maxDate}
            initial={{
              amountEuros: moneyToEuros(savingsTransfer.amount),
              label: savingsTransfer.label,
              date: formatCalendarDate(savingsTransfer.date),
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
