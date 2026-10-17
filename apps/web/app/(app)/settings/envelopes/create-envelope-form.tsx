"use client";

import { useActionState, useState } from "react";
import { createVariableEnvelopeAction } from "@/actions/variable-envelope";
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

export function CreateEnvelopeForm() {
  const [state, formAction, pending] = useActionState(
    createVariableEnvelopeAction,
    initialVariableEnvelopeActionState,
  );
  const [mode, setMode] = useState<"amount" | "percentage">("amount");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouvelle enveloppe</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="label">Libellé</FieldLabel>
              <Input id="label" name="label" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="mode">Mode</FieldLabel>
              <Select
                name="mode"
                value={mode}
                onValueChange={(value) => setMode(value as "amount" | "percentage")}
              >
                <SelectTrigger id="mode">
                  <SelectValue placeholder="Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">Montant fixe</SelectItem>
                  <SelectItem value="percentage">Pourcentage</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {mode === "amount" ? (
              <Field>
                <FieldLabel htmlFor="amountEuros">Montant (€)</FieldLabel>
                <Input
                  id="amountEuros"
                  name="amountEuros"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                />
              </Field>
            ) : (
              <Field>
                <FieldLabel htmlFor="percentage">Pourcentage (%)</FieldLabel>
                <Input
                  id="percentage"
                  name="percentage"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  required
                />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="effectiveFrom">Date d'effet</FieldLabel>
              <Select name="effectiveFrom" defaultValue="current">
                <SelectTrigger id="effectiveFrom">
                  <SelectValue placeholder="Date d'effet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Ce mois-ci</SelectItem>
                  <SelectItem value="next">Le mois prochain</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {state.status === "error" ? <FieldError>{state.message}</FieldError> : null}
            {state.status === "success" ? (
              <p className="text-sm text-muted-foreground">{state.message}</p>
            ) : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Création..." : "Créer"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
