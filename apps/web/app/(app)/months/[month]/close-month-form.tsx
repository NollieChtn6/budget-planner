"use client";

import { useActionState, useMemo, useState } from "react";
import { closeMonthAction } from "@/actions/month";
import { initialVariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

function euros(amount: number): string {
  return `${amount.toFixed(2)} €`;
}

export function CloseMonthForm({
  envelopeRemainders,
  leftover,
  provisions,
}: {
  envelopeRemainders: { label: string; remaining: number }[];
  leftover: number;
  provisions: { id: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    closeMonthAction,
    initialVariableEnvelopeActionState,
  );
  const [amounts, setAmounts] = useState<Record<string, number>>({});

  const allocated = useMemo(
    () =>
      Object.values(amounts).reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0),
    [amounts],
  );
  const overAllocated = allocated > Math.max(0, leftover);

  const rows: {
    key: string;
    destination: "savings" | "provision";
    provisionId: string;
    label: string;
  }[] = [
    { key: "savings", destination: "savings", provisionId: "", label: "Épargne" },
    ...provisions.map((provision) => ({
      key: provision.id,
      destination: "provision" as const,
      provisionId: provision.id,
      label: provision.label,
    })),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clôturer le mois</CardTitle>
        <CardDescription>
          Une fois clôturé, le mois ne sera plus modifiable, sauf réouverture.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-col gap-1 text-sm">
          {envelopeRemainders.map((entry) => (
            <li key={entry.label} className="flex justify-between">
              <span>{entry.label}</span>
              <span className={entry.remaining < 0 ? "text-destructive" : ""}>
                {euros(entry.remaining)}
              </span>
            </li>
          ))}
          <li className="flex justify-between border-t pt-1 font-medium">
            <span>Reliquat total</span>
            <span className={leftover < 0 ? "text-destructive" : ""}>{euros(leftover)}</span>
          </li>
        </ul>
        {leftover < 0 ? (
          <p className="text-sm text-destructive">
            Le reliquat est négatif : {euros(-leftover)} seront enregistrés comme financés par
            l'épargne.
          </p>
        ) : null}

        <form action={formAction} className="flex flex-col gap-3">
          <p className="text-sm font-medium">Répartition du reliquat</p>
          {rows.map((row) => (
            <Field key={row.key}>
              <FieldLabel htmlFor={`allocation-${row.key}`}>{row.label}</FieldLabel>
              <input type="hidden" name="allocationDestination" value={row.destination} />
              <input type="hidden" name="allocationProvisionId" value={row.provisionId} />
              <Input
                id={`allocation-${row.key}`}
                name="allocationAmountEuros"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                onChange={(event) =>
                  setAmounts((current) => ({
                    ...current,
                    [row.key]: event.target.valueAsNumber,
                  }))
                }
              />
            </Field>
          ))}
          {overAllocated ? (
            <p className="text-sm text-muted-foreground">
              Tu répartis {euros(allocated - Math.max(0, leftover))} de plus que le reliquat. C'est
              possible, mais cet argent viendra d'ailleurs.
            </p>
          ) : null}
          {state.status === "error" ? <FieldError>{state.message}</FieldError> : null}
          {state.status === "success" ? (
            <p className="text-sm text-muted-foreground">{state.message}</p>
          ) : null}
          <Button type="submit" variant="destructive" disabled={pending}>
            {pending ? "Clôture..." : "Clôturer le mois"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
