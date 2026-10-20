"use client";

import { useState } from "react";
import { openMonthAction } from "@/actions/month";
import { initialVariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatEuros as euros } from "@/lib/format-money";
import { useFeedbackActionState } from "@/lib/use-feedback-action-state";

export function OpenMonthForm({ totalFixedEuros }: { totalFixedEuros: number }) {
  const [state, formAction, pending] = useFeedbackActionState(
    openMonthAction,
    initialVariableEnvelopeActionState,
  );
  const [incomeEuros, setIncomeEuros] = useState<number | null>(null);
  const disposableIncome = incomeEuros !== null ? incomeEuros - totalFixedEuros : null;

  return (
    <Card className="lg:w-sm">
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
                autoFocus
                onChange={(event) =>
                  setIncomeEuros(
                    Number.isFinite(event.target.valueAsNumber) ? event.target.valueAsNumber : null,
                  )
                }
              />
            </Field>
            <div className="grid grid-cols-2 gap-3 border-t pt-3 text-sm text-muted-foreground">
              <div>
                Postes fixes
                <p className="font-heading text-base text-foreground">{euros(totalFixedEuros)}</p>
              </div>
              <div>
                Reste à vivre
                <p className="font-heading text-base text-foreground">
                  {disposableIncome !== null ? euros(disposableIncome) : "—"}
                </p>
              </div>
            </div>
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
