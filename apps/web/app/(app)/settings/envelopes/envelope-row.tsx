"use client";

import { useActionState, useEffect, useState } from "react";
import {
  addVariableEnvelopeVersionAction,
  archiveVariableEnvelopeAction,
  unarchiveVariableEnvelopeAction,
} from "@/actions/variable-envelope";
import { initialVariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import type { EnvelopeRowData } from "./envelope-table";

export function EnvelopeRow({ envelope }: { envelope: EnvelopeRowData }) {
  const [editing, setEditing] = useState<"value" | "archive" | null>(null);
  const [mode, setMode] = useState<"amount" | "percentage">(envelope.mode);

  const [valueState, valueAction, valuePending] = useActionState(
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

  useEffect(() => {
    if (valueState.status === "success") setEditing(null);
  }, [valueState.status]);
  useEffect(() => {
    if (archiveState.status === "success") setEditing(null);
  }, [archiveState.status]);

  function cancel() {
    setEditing(null);
    setMode(envelope.mode);
  }

  if (editing === "value") {
    return (
      <TableRow onKeyDown={(e) => e.key === "Escape" && cancel()}>
        <TableCell colSpan={4} className="whitespace-normal">
          <form action={valueAction} className="flex flex-wrap items-end gap-3 py-1">
            <input type="hidden" name="envelopeId" value={envelope.id} />
            <input type="hidden" name="mode" value={mode} />
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs">Libellé</span>
              <Input
                name="label"
                defaultValue={envelope.label}
                required
                autoFocus
                className="w-40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs">Mode</span>
              <Select value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">Montant fixe</SelectItem>
                  <SelectItem value="percentage">Pourcentage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {mode === "amount" ? (
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Montant (€)</span>
                <Input
                  name="amountEuros"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={envelope.amountEuros ?? undefined}
                  required
                  className="w-28"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Pourcentage (%)</span>
                <Input
                  name="percentage"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  defaultValue={envelope.percentage ?? undefined}
                  required
                  className="w-24"
                />
              </div>
            )}
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs">Date d'effet</span>
              <Select name="effectiveFrom" defaultValue="current">
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Ce mois-ci</SelectItem>
                  <SelectItem value="next">Le mois prochain</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={valuePending}>
                {valuePending ? "Enregistrement..." : "Valider"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={cancel}>
                Annuler
              </Button>
            </div>
            {valueState.status === "error" ? (
              <FieldError className="basis-full">{valueState.message}</FieldError>
            ) : null}
          </form>
        </TableCell>
      </TableRow>
    );
  }

  if (editing === "archive") {
    return (
      <TableRow onKeyDown={(e) => e.key === "Escape" && cancel()}>
        <TableCell colSpan={4} className="whitespace-normal">
          <form action={archiveAction} className="flex flex-wrap items-end gap-3 py-1">
            <input type="hidden" name="envelopeId" value={envelope.id} />
            <div className="font-medium text-sm">Archiver « {envelope.label} »</div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs">À partir de</span>
              <Select name="effectiveFrom" defaultValue="current">
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Ce mois-ci</SelectItem>
                  <SelectItem value="next">Le mois prochain</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" variant="destructive" disabled={archivePending}>
                {archivePending ? "Archivage..." : "Archiver"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={cancel}>
                Annuler
              </Button>
            </div>
            {archiveState.status === "error" ? (
              <FieldError className="basis-full">{archiveState.message}</FieldError>
            ) : null}
          </form>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell className="whitespace-normal font-medium">
        {envelope.label}
        {envelope.archivedFrom ? (
          <div className="font-normal text-muted-foreground text-xs">
            Archivée à partir de {envelope.archivedFrom}
          </div>
        ) : null}
      </TableCell>
      <TableCell>
        {envelope.mode === "amount" ? "Montant fixe" : "Pourcentage de la base"}
      </TableCell>
      <TableCell className="text-right font-heading">{envelope.valueLabel}</TableCell>
      <TableCell className="whitespace-normal text-right">
        {envelope.archivedFrom ? (
          <form action={unarchiveAction} className="inline">
            <input type="hidden" name="envelopeId" value={envelope.id} />
            <Button type="submit" variant="link" size="sm" disabled={unarchivePending}>
              Annuler l'archivage
            </Button>
          </form>
        ) : (
          <>
            <Button type="button" variant="link" size="sm" onClick={() => setEditing("value")}>
              Modifier
            </Button>
            <Button type="button" variant="link" size="sm" onClick={() => setEditing("archive")}>
              Archiver
            </Button>
          </>
        )}
        {unarchiveState.status === "error" ? (
          <FieldError>{unarchiveState.message}</FieldError>
        ) : null}
      </TableCell>
    </TableRow>
  );
}
