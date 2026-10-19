"use client";

import {
  type CalendarDate,
  type ExtraIncome,
  formatCalendarDate,
  moneyToEuros,
} from "@budget/domain";
import { useActionState, useEffect, useState } from "react";
import { deleteExtraIncomeAction, updateExtraIncomeAction } from "@/actions/extra-income";
import { initialOperationActionState } from "@/actions/operation-state";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { formatEuros } from "@/lib/format-money";
import { ExtraIncomeFields } from "./extra-income-fields";

function formatDay(date: CalendarDate): string {
  return `${date.day.toString().padStart(2, "0")}/${date.month.toString().padStart(2, "0")}`;
}

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
      <li className="flex flex-col gap-1 border-b pb-2 last:border-b-0 last:pb-0">
        <div className="flex justify-between gap-2 text-sm">
          <span className="text-muted-foreground">{formatDay(extraIncome.date)}</span>
          <span className="flex-1">{extraIncome.label}</span>
          <span className="text-positive">+{formatEuros(moneyToEuros(extraIncome.amount))}</span>
        </div>
        {editable ? (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              Modifier
            </Button>
            <form action={deleteAction}>
              <input type="hidden" name="id" value={extraIncome.id} />
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
        <input type="hidden" name="id" value={extraIncome.id} />
        <FieldGroup>
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
          {updateState.status === "error" ? <FieldError>{updateState.message}</FieldError> : null}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={updatePending}>
              {updatePending ? "Enregistrement..." : "Enregistrer"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)}>
              Annuler
            </Button>
          </div>
        </FieldGroup>
      </form>
    </li>
  );
}
