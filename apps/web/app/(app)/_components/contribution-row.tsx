"use client";

import {
  type Contribution,
  canModifyContribution,
  formatCalendarDate,
  moneyToEuros,
} from "@budget/domain";
import { useActionState, useEffect, useState } from "react";
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
  ProvisionTarget,
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
  const [updateState, updateAction, updatePending] = useActionState(
    updateContributionAction,
    initialOperationActionState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
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

  if (!isEditing) {
    return (
      <TableRow>
        <TableCell className="tabular-nums">{formatDay(contribution.date)}</TableCell>
        <TableCell>
          <MutedText>Versement</MutedText>
        </TableCell>
        <TableCell>
          {contribution.origin === "closing" ? (
            <MutedText>Répartition du reliquat</MutedText>
          ) : null}
        </TableCell>
        <TableCell />
        <TableCell>
          <ProvisionTarget label={provisionLabel} />
        </TableCell>
        <AmountCell incoming>{formatEuros(moneyToEuros(contribution.amount))}</AmountCell>
        {editable ? (
          canModify ? (
            <OperationActions
              id={contribution.id}
              onEdit={() => setIsEditing(true)}
              deleteAction={deleteAction}
              deletePending={deletePending}
              error={deleteState.status === "error" ? deleteState.message : undefined}
            />
          ) : (
            <TableCell />
          )
        ) : null}
      </TableRow>
    );
  }

  return (
    <OperationEditRow>
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
    </OperationEditRow>
  );
}
