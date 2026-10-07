"use client";

import {
  type CalendarDate,
  type Contribution,
  formatCalendarDate,
  moneyToEuros,
} from "@budget/domain";
import { useActionState, useEffect, useState } from "react";
import { deleteContributionAction, updateContributionAction } from "@/actions/contribution";
import { initialVariableEnvelopeActionState } from "@/actions/variable-envelope-state";
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

function euros(amount: number): string {
  return `${amount.toFixed(2)} €`;
}

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
    initialVariableEnvelopeActionState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteContributionAction,
    initialVariableEnvelopeActionState,
  );

  useEffect(() => {
    if (updateState.status === "success") {
      setIsEditing(false);
    }
  }, [updateState.status]);

  const canModify = editable && contribution.origin === "manual";

  if (!isEditing) {
    return (
      <li className="flex flex-col gap-1 border-b pb-2 last:border-b-0 last:pb-0">
        <div className="flex justify-between gap-2 text-sm">
          <span className="text-muted-foreground">{formatDay(contribution.date)}</span>
          <span className="flex-1">{provisionLabel}</span>
          <span>{euros(moneyToEuros(contribution.amount))}</span>
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
