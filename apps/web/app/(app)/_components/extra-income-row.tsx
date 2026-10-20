"use client";

import { type ExtraIncome, formatCalendarDate, moneyToEuros } from "@budget/domain";
import { useEffect, useState } from "react";
import { deleteExtraIncomeAction, updateExtraIncomeAction } from "@/actions/extra-income";
import { initialOperationActionState } from "@/actions/operation-state";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { formatEuros } from "@/lib/format-money";
import { useFeedbackActionState } from "@/lib/use-feedback-action-state";
import { ExtraIncomeFields } from "./extra-income-fields";
import {
  MutedText,
  OPERATION_EDIT_FULL_WIDTH_CLASS,
  OPERATION_EDIT_GRID_CLASS,
  OperationReadRow,
  OperationRow,
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
  const [updateState, updateAction, updatePending] = useFeedbackActionState(
    updateExtraIncomeAction,
    initialOperationActionState,
  );
  const [deleteState, deleteAction, deletePending] = useFeedbackActionState(
    deleteExtraIncomeAction,
    initialOperationActionState,
  );

  useEffect(() => {
    if (updateState.status === "success") {
      setIsEditing(false);
    }
  }, [updateState.status]);

  const deletion = {
    id: extraIncome.id,
    action: deleteAction,
    pending: deletePending,
    error: deleteState.status === "error" ? deleteState.message : undefined,
  };
  const read = (
    <OperationReadRow
      date={extraIncome.date}
      target={<MutedText>Reste à vivre</MutedText>}
      place={<MutedText>Entrée exceptionnelle</MutedText>}
      description={extraIncome.label}
      amount={formatEuros(moneyToEuros(extraIncome.amount))}
      incoming
      editable={editable}
      editLabel={`Modifier l'entrée ${extraIncome.label}`}
      edit={{ onEdit: () => setIsEditing(true), delete: deletion }}
    />
  );

  return (
    <OperationRow
      isEditing={isEditing}
      onClose={() => setIsEditing(false)}
      title="Modifier l'entrée exceptionnelle"
      read={read}
      deletion={deletion}
    >
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
    </OperationRow>
  );
}
