"use client";

import { useActionState } from "react";
import { createFixedEntryAction } from "@/actions/fixed-entry";
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

export function CreateFixedEntryForm() {
  const [state, formAction, pending] = useActionState(
    createFixedEntryAction,
    initialVariableEnvelopeActionState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouveau poste fixe</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="label">Libellé</FieldLabel>
              <Input id="label" name="label" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="type">Type</FieldLabel>
              <Select name="type" defaultValue="charge">
                <SelectTrigger id="type">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="charge">Charge</SelectItem>
                  <SelectItem value="scheduledSaving">Épargne programmée</SelectItem>
                </SelectContent>
              </Select>
            </Field>
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
