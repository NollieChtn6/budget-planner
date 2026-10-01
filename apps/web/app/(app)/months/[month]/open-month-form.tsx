"use client";

import { useActionState } from "react";
import { openMonthAction } from "@/actions/month";
import { initialVariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function OpenMonthForm() {
  const [state, formAction, pending] = useActionState(
    openMonthAction,
    initialVariableEnvelopeActionState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ouvrir le mois</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="incomeEuros">Revenu du mois (€)</FieldLabel>
              <Input
                id="incomeEuros"
                name="incomeEuros"
                type="number"
                step="0.01"
                min="0"
                required
              />
            </Field>
            {state.status === "error" ? <FieldError>{state.message}</FieldError> : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Ouverture..." : "Ouvrir le mois"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
