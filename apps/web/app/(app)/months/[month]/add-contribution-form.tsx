"use client";

import { useActionState } from "react";
import { createContributionAction } from "@/actions/contribution";
import { initialVariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
}: {
  provisions: { id: string; label: string }[];
  minDate: string;
  maxDate: string;
  defaultDate: string;
}) {
  const [state, formAction, pending] = useActionState(
    createContributionAction,
    initialVariableEnvelopeActionState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouveau versement</CardTitle>
      </CardHeader>
      <CardContent>
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
            <Button type="submit" disabled={pending}>
              {pending ? "Ajout..." : "Ajouter le versement"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
