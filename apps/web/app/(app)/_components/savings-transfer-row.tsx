"use client";

import {
  formatCalendarDate,
  moneyToEuros,
  type SavingsTransfer,
  type SavingsTransferKind,
} from "@budget/domain";
import { SparklesIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { initialOperationActionState } from "@/actions/operation-state";
import {
  deleteSavingsTransferAction,
  updateSavingsTransferAction,
} from "@/actions/savings-transfer";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { formatEuros } from "@/lib/format-money";
import { useFeedbackActionState } from "@/lib/use-feedback-action-state";
import {
  MutedText,
  OPERATION_EDIT_FULL_WIDTH_CLASS,
  OPERATION_EDIT_GRID_CLASS,
  OperationReadRow,
  OperationRow,
  TargetChip,
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
  const [updateState, updateAction, updatePending] = useFeedbackActionState(
    updateSavingsTransferAction,
    initialOperationActionState,
  );
  const [deleteState, deleteAction, deletePending] = useFeedbackActionState(
    deleteSavingsTransferAction,
    initialOperationActionState,
  );

  // Stay on the form when the save carries a warning (R37), so it can be read.
  useEffect(() => {
    if (updateState.status === "success" && !updateState.warning) {
      setIsEditing(false);
    }
  }, [updateState.status, updateState.warning]);

  const deletion = {
    id: savingsTransfer.id,
    action: deleteAction,
    pending: deletePending,
    error: deleteState.status === "error" ? deleteState.message : undefined,
  };
  const closeEdit = () => {
    setKind(savingsTransfer.kind);
    setIsEditing(false);
  };
  const read = (
    <OperationReadRow
      date={savingsTransfer.date}
      target={<TargetChip kind="savings" label="Épargne" />}
      place={
        savingsTransfer.kind === "convertedUrge" ? (
          <span className="inline-flex items-center gap-1.5 text-positive">
            <SparklesIcon aria-hidden className="size-3.5" />
            Envie convertie
          </span>
        ) : (
          <MutedText>Transfert</MutedText>
        )
      }
      description={savingsTransfer.label}
      amount={formatEuros(moneyToEuros(savingsTransfer.amount))}
      incoming={false}
      editable={editable}
      editLabel={`Modifier le transfert ${savingsTransfer.label ?? "vers l'épargne"}`}
      edit={{ onEdit: () => setIsEditing(true), delete: deletion }}
    />
  );

  return (
    <OperationRow
      isEditing={isEditing}
      onClose={closeEdit}
      title="Modifier le transfert d'épargne"
      read={read}
      deletion={deletion}
    >
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
            <Button type="button" variant="outline" size="sm" onClick={closeEdit}>
              {updateState.warning ? "Fermer" : "Annuler"}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </OperationRow>
  );
}
