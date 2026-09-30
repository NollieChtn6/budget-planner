"use client";

import { useActionState, useState } from "react";
import { createProvisionAction } from "@/actions/provision";
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

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear().toString().padStart(4, "0")}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;
}

export function CreateProvisionForm() {
  const [state, formAction, pending] = useActionState(
    createProvisionAction,
    initialVariableEnvelopeActionState,
  );
  const [type, setType] = useState<"deadline" | "reserve">("deadline");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouvelle provision</CardTitle>
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
              <Select
                name="type"
                value={type}
                onValueChange={(value) => setType(value as "deadline" | "reserve")}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deadline">À échéance</SelectItem>
                  <SelectItem value="reserve">Réserve</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="targetEuros">
                {type === "deadline" ? "Objectif (€)" : "Plafond (€)"}
              </FieldLabel>
              <Input
                id="targetEuros"
                name="targetEuros"
                type="number"
                step="0.01"
                min="0.01"
                required
              />
            </Field>
            {type === "deadline" ? (
              <>
                <Field>
                  <FieldLabel htmlFor="startMonth">Mois de départ</FieldLabel>
                  <Input
                    id="startMonth"
                    name="startMonth"
                    type="month"
                    defaultValue={currentMonthValue()}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="durationMonths">Durée (mois)</FieldLabel>
                  <Input
                    id="durationMonths"
                    name="durationMonths"
                    type="number"
                    step="1"
                    min="1"
                    required
                  />
                </Field>
              </>
            ) : (
              <Field>
                <FieldLabel htmlFor="monthlyAmountEuros">Mensualité (€)</FieldLabel>
                <Input
                  id="monthlyAmountEuros"
                  name="monthlyAmountEuros"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                />
              </Field>
            )}
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
