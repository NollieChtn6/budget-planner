"use client";

import {
  type Contribution,
  canModifyContribution,
  formatCalendarDate,
  moneyToEuros,
} from "@budget/domain";
import { useEffect, useState } from "react";
import { deleteContributionAction, updateContributionAction } from "@/actions/contribution";
import { initialOperationActionState } from "@/actions/operation-state";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export function ContributionRow({
  contribution,
  provisionLabel,
  provisions,
  minDate,
  maxDate,
  editable,
}: {
  contribution: Contribution;
  provisionLabel: string;
  provisions: { id: string; label: string }[];
  minDate: string;
  maxDate: string;
  editable: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [updateState, updateAction, updatePending] = useFeedbackActionState(
    updateContributionAction,
    initialOperationActionState,
  );
  const [deleteState, deleteAction, deletePending] = useFeedbackActionState(
    deleteContributionAction,
    initialOperationActionState,
  );

  // Stay on the form when the save carries a warning (R37), so it can be read.
  useEffect(() => {
    if (updateState.status === "success" && !updateState.warning) {
      setIsEditing(false);
    }
  }, [updateState.status, updateState.warning]);

  const canModify = editable && canModifyContribution(contribution);

  const deletion = {
    id: contribution.id,
    action: deleteAction,
    pending: deletePending,
    error: deleteState.status === "error" ? deleteState.message : undefined,
  };
  const read = (
    <OperationReadRow
      date={contribution.date}
      target={<TargetChip kind="provision" label={provisionLabel} />}
      place={<MutedText>Versement</MutedText>}
      description={
        contribution.origin === "closing" ? <MutedText>Répartition du reliquat</MutedText> : null
      }
      amount={formatEuros(moneyToEuros(contribution.amount))}
      incoming
      editable={editable}
      editLabel={`Modifier le versement vers ${provisionLabel}`}
      edit={canModify ? { onEdit: () => setIsEditing(true), delete: deletion } : undefined}
    />
  );

  return (
    <OperationRow
      isEditing={isEditing}
      onClose={() => setIsEditing(false)}
      title="Modifier le versement"
      read={read}
      deletion={deletion}
    >
      <form action={updateAction}>
        <input type="hidden" name="id" value={contribution.id} />
        <FieldGroup className={OPERATION_EDIT_GRID_CLASS}>
          <Field>
            <FieldLabel htmlFor={`edit-contributionAmountEuros-${contribution.id}`}>
              Montant (€)
            </FieldLabel>
            <Input
              id={`edit-contributionAmountEuros-${contribution.id}`}
              name="amountEuros"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={moneyToEuros(contribution.amount)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`edit-provisionId-${contribution.id}`}>Provision</FieldLabel>
            <Select name="provisionId" defaultValue={contribution.provisionId}>
              <SelectTrigger id={`edit-provisionId-${contribution.id}`}>
                <SelectValue placeholder="Provision" />
              </SelectTrigger>
              <SelectContent>
                {provisions.map((provision) => (
                  <SelectItem key={provision.id} value={provision.id}>
                    {provision.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor={`edit-contributionDate-${contribution.id}`}>Date</FieldLabel>
            <Input
              id={`edit-contributionDate-${contribution.id}`}
              name="date"
              type="date"
              required
              min={minDate}
              max={maxDate}
              defaultValue={formatCalendarDate(contribution.date)}
            />
          </Field>
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
