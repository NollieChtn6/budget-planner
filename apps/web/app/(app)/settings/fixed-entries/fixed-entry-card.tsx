"use client";

import { compareMonths, type FixedEntry, formatMonth, moneyToEuros } from "@budget/domain";
import { useActionState } from "react";
import {
  addFixedEntryVersionAction,
  archiveFixedEntryAction,
  unarchiveFixedEntryAction,
} from "@/actions/fixed-entry";
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

const TYPE_LABELS: Record<FixedEntry["type"], string> = {
  charge: "Charge",
  scheduledSaving: "Épargne programmée",
};

export function FixedEntryCard({ fixedEntry }: { fixedEntry: FixedEntry }) {
  const [addVersionState, addVersionAction, addVersionPending] = useActionState(
    addFixedEntryVersionAction,
    initialVariableEnvelopeActionState,
  );
  const [archiveState, archiveAction, archivePending] = useActionState(
    archiveFixedEntryAction,
    initialVariableEnvelopeActionState,
  );
  const [unarchiveState, unarchiveAction, unarchivePending] = useActionState(
    unarchiveFixedEntryAction,
    initialVariableEnvelopeActionState,
  );

  const sortedVersions = [...fixedEntry.versions].sort((a, b) =>
    compareMonths(a.effectiveFrom, b.effectiveFrom),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{fixedEntry.label}</CardTitle>
        <CardDescription>{TYPE_LABELS[fixedEntry.type]}</CardDescription>
        {fixedEntry.archivedFrom ? (
          <CardDescription>
            Archivé à partir de {formatMonth(fixedEntry.archivedFrom)}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-col gap-1 text-sm">
          {sortedVersions.map((version) => (
            <li key={formatMonth(version.effectiveFrom)}>
              {formatMonth(version.effectiveFrom)} — {moneyToEuros(version.amount).toFixed(2)} €
            </li>
          ))}
        </ul>

        <form action={addVersionAction} className="flex flex-col gap-3 border-t pt-3">
          <Input type="hidden" name="fixedEntryId" value={fixedEntry.id} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`amountEuros-${fixedEntry.id}`}>Montant (€)</FieldLabel>
              <Input
                id={`amountEuros-${fixedEntry.id}`}
                name="amountEuros"
                type="number"
                step="0.01"
                min="0"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`effectiveFrom-${fixedEntry.id}`}>Date d'effet</FieldLabel>
              <Select name="effectiveFrom" defaultValue="current">
                <SelectTrigger id={`effectiveFrom-${fixedEntry.id}`}>
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

        {fixedEntry.archivedFrom ? (
          <form action={unarchiveAction} className="border-t pt-3">
            <Input type="hidden" name="fixedEntryId" value={fixedEntry.id} />
            {unarchiveState.status === "error" ? (
              <FieldError>{unarchiveState.message}</FieldError>
            ) : null}
            <Button type="submit" variant="outline" disabled={unarchivePending}>
              {unarchivePending ? "Désarchivage..." : "Désarchiver"}
            </Button>
          </form>
        ) : (
          <form action={archiveAction} className="flex flex-col gap-3 border-t pt-3">
            <Input type="hidden" name="fixedEntryId" value={fixedEntry.id} />
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`archive-effectiveFrom-${fixedEntry.id}`}>
                  Archiver à partir de
                </FieldLabel>
                <Select name="effectiveFrom" defaultValue="current">
                  <SelectTrigger id={`archive-effectiveFrom-${fixedEntry.id}`}>
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
