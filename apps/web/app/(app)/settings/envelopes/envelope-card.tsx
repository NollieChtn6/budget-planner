"use client";

import { compareMonths, formatMonth, moneyToEuros, type VariableEnvelope } from "@budget/domain";
import { useActionState, useState } from "react";
import {
  addVariableEnvelopeVersionAction,
  archiveVariableEnvelopeAction,
  unarchiveVariableEnvelopeAction,
} from "@/actions/variable-envelope";
import { initialVariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function EnvelopeCard({ envelope }: { envelope: VariableEnvelope }) {
  const [mode, setMode] = useState<"amount" | "percentage">("amount");
  const [addVersionState, addVersionAction, addVersionPending] = useActionState(
    addVariableEnvelopeVersionAction,
    initialVariableEnvelopeActionState,
  );
  const [archiveState, archiveAction, archivePending] = useActionState(
    archiveVariableEnvelopeAction,
    initialVariableEnvelopeActionState,
  );
  const [unarchiveState, unarchiveAction, unarchivePending] = useActionState(
    unarchiveVariableEnvelopeAction,
    initialVariableEnvelopeActionState,
  );

  const sortedVersions = [...envelope.versions].sort((a, b) =>
    compareMonths(a.effectiveFrom, b.effectiveFrom),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{envelope.label}</CardTitle>
        {envelope.archivedFrom ? (
          <CardDescription>
            Archivée à partir de {formatMonth(envelope.archivedFrom)}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-col gap-1 text-sm">
          {sortedVersions.map((version) => (
            <li key={formatMonth(version.effectiveFrom)}>
              {formatMonth(version.effectiveFrom)} —{" "}
              {version.mode === "amount"
                ? `${moneyToEuros(version.value).toFixed(2)} €`
                : `${version.value} %`}
            </li>
          ))}
        </ul>

        <form action={addVersionAction} className="flex flex-col gap-3 border-t pt-3">
          <input type="hidden" name="envelopeId" value={envelope.id} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`mode-${envelope.id}`}>Mode</FieldLabel>
              <Select
                name="mode"
                value={mode}
                onValueChange={(value) => setMode(value as "amount" | "percentage")}
              >
                <SelectTrigger id={`mode-${envelope.id}`}>
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
                <FieldLabel htmlFor={`amountEuros-${envelope.id}`}>Montant (€)</FieldLabel>
                <Input
                  id={`amountEuros-${envelope.id}`}
                  name="amountEuros"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                />
              </Field>
            ) : (
              <Field>
                <FieldLabel htmlFor={`percentage-${envelope.id}`}>Pourcentage (%)</FieldLabel>
                <Input
                  id={`percentage-${envelope.id}`}
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
              <FieldLabel htmlFor={`effectiveFrom-${envelope.id}`}>Date d'effet</FieldLabel>
              <Select name="effectiveFrom" defaultValue="current">
                <SelectTrigger id={`effectiveFrom-${envelope.id}`}>
                  <SelectValue placeholder="Date d'effet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Ce mois-ci</SelectItem>
                  <SelectItem value="next">Le mois prochain</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {addVersionState.status === "error" ? (
              <FieldError>{addVersionState.message}</FieldError>
            ) : null}
            {addVersionState.status === "success" ? (
              <p className="text-sm text-muted-foreground">{addVersionState.message}</p>
            ) : null}
            <Button type="submit" variant="outline" disabled={addVersionPending}>
              {addVersionPending ? "Ajout..." : "Ajouter une version"}
            </Button>
          </FieldGroup>
        </form>

        {envelope.archivedFrom ? (
          <form action={unarchiveAction} className="border-t pt-3">
            <input type="hidden" name="envelopeId" value={envelope.id} />
            {unarchiveState.status === "error" ? (
              <FieldError>{unarchiveState.message}</FieldError>
            ) : null}
            <Button type="submit" variant="outline" disabled={unarchivePending}>
              {unarchivePending ? "Désarchivage..." : "Désarchiver"}
            </Button>
          </form>
        ) : (
          <form action={archiveAction} className="flex flex-col gap-3 border-t pt-3">
            <input type="hidden" name="envelopeId" value={envelope.id} />
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`archive-effectiveFrom-${envelope.id}`}>
                  Archiver à partir de
                </FieldLabel>
                <Select name="effectiveFrom" defaultValue="current">
                  <SelectTrigger id={`archive-effectiveFrom-${envelope.id}`}>
                    <SelectValue placeholder="Date d'effet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Ce mois-ci</SelectItem>
                    <SelectItem value="next">Le mois prochain</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {archiveState.status === "error" ? (
                <FieldError>{archiveState.message}</FieldError>
              ) : null}
              <Button type="submit" variant="destructive" disabled={archivePending}>
                {archivePending ? "Archivage..." : "Archiver"}
              </Button>
            </FieldGroup>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
