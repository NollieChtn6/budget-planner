"use client";

import { useActionState, useEffect } from "react";
import { createContributionAction } from "@/actions/contribution";
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
  const [state, formAction, pending] = useActionState(
    createContributionAction,
    initialVariableEnvelopeActionState,
  );
  useEffect(() => {
    if (state.status === "success") {
      onSuccess?.();
    }
  }, [state.status, onSuccess]);

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
          <FieldLabel htmlFor="provisionId">Provision</FieldLabel>
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
        {state.status === "success" ? (
          <p className="text-sm text-muted-foreground">{state.message}</p>
        ) : null}
        <Button type="submit" variant="accent" disabled={pending}>
          {pending ? "Ajout..." : "Ajouter le versement"}
        </Button>
      </FieldGroup>
    </form>
  );
}
