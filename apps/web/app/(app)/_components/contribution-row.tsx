"use client";

import {
  type CalendarDate,
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
import { formatEuros } from "@/lib/format-money";

function formatDay(date: CalendarDate): string {
  return `${date.day.toString().padStart(2, "0")}/${date.month.toString().padStart(2, "0")}`;
}

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
      <li className="flex flex-col gap-1 border-b pb-2 last:border-b-0 last:pb-0">
        <div className="flex justify-between gap-2 text-sm">
          <span className="text-muted-foreground">{formatDay(contribution.date)}</span>
          <span className="flex-1">{provisionLabel}</span>
          <span>{formatEuros(moneyToEuros(contribution.amount))}</span>
        </div>
        {canModify ? (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              Modifier
            </Button>
            <form action={deleteAction}>
              <input type="hidden" name="id" value={contribution.id} />
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
        <input type="hidden" name="id" value={contribution.id} />
        <FieldGroup>
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
