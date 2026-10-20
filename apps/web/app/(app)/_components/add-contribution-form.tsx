"use client";

import { useEffect } from "react";
import { createContributionAction } from "@/actions/contribution";
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
import { useFeedbackActionState } from "@/lib/use-feedback-action-state";

export function AddContributionForm({
  provisions,
  minDate,
  maxDate,
  defaultDate,
  onSuccess,
}: {
  provisions: { id: string; label: string }[];
  minDate: string;
  maxDate: string;
  defaultDate: string;
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useFeedbackActionState(
    createContributionAction,
    initialOperationActionState,
  );
  // A warning (R37) must stay readable, so the dialog only closes on its own for a clean success.
  useEffect(() => {
    if (state.status === "success" && !state.warning) {
      onSuccess?.();
    }
  }, [state.status, state.warning, onSuccess]);

  return (
    <form action={formAction}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="contributionAmountEuros">Montant (€)</FieldLabel>
          <Input
            id="contributionAmountEuros"
            name="amountEuros"
            type="number"
            step="0.01"
            min="0"
            required
            autoFocus
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="provisionId">Provision (prélevé sur le reste à vivre)</FieldLabel>
          <Select name="provisionId" defaultValue={provisions[0]?.id}>
            <SelectTrigger id="provisionId">
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
          <FieldLabel htmlFor="contributionDate">Date</FieldLabel>
          <Input
            id="contributionDate"
            name="date"
            type="date"
            required
            min={minDate}
            max={maxDate}
            defaultValue={defaultDate}
          />
        </Field>
        {state.status === "error" ? <FieldError>{state.message}</FieldError> : null}
        {state.warning ? (
          <p className="rounded-md border border-alert-warning/60 bg-card px-3 py-2 text-sm">
            {state.warning}
          </p>
        ) : null}
        {state.warning ? (
          <Button type="button" variant="outline" onClick={() => onSuccess?.()}>
            Fermer
          </Button>
        ) : (
          <Button type="submit" variant="accent" disabled={pending}>
            {pending ? "Ajout..." : "Ajouter le versement"}
          </Button>
        )}
      </FieldGroup>
    </form>
  );
}
