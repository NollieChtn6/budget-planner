"use client";

import { useActionState, useEffect, useState } from "react";
import {
  addVariableEnvelopeVersionAction,
  archiveVariableEnvelopeAction,
  unarchiveVariableEnvelopeAction,
} from "@/actions/variable-envelope";
import { initialVariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { EditableRow } from "@/components/editable-row";
import { CardCell, CardRow, CardTapTarget } from "@/components/responsive-table";
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
import {
  ArchiveNote,
  FormActions,
  FormField,
  MonthChoiceSelect,
  OtherActions,
  SETTINGS_FORM_CLASS,
} from "../settings-form-parts";
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

  const archived = envelope.archivedFromLabel !== null;

  const read = (
    <CardRow className={archived ? "text-muted-foreground" : undefined}>
      <CardCell heading className="whitespace-normal font-medium">
        {envelope.label}
        {envelope.archivedFromLabel ? (
          <div className="font-normal text-muted-foreground text-xs">
            Archivée à partir {envelope.archivedFromLabel}
          </div>
        ) : null}
        {archived ? null : (
          <CardTapTarget label={`Modifier ${envelope.label}`} onClick={() => setEditing("value")} />
        )}
      </CardCell>
      <CardCell label="Mode">
        {envelope.mode === "amount" ? "Montant fixe" : "Pourcentage"}
      </CardCell>
      <CardCell label="Valeur" className="text-right font-heading">
        <span>
          {envelope.valueLabel}
          {envelope.upcoming ? (
            <span className="block font-sans font-normal text-muted-foreground text-xs">
              puis {envelope.upcoming.valueLabel} à partir {envelope.upcoming.fromLabel}
            </span>
          ) : null}
        </span>
      </CardCell>
      <CardCell hideOnMobile={!archived} className="whitespace-normal text-right">
        {archived ? (
          <form action={unarchiveAction} className="inline">
            <input type="hidden" name="envelopeId" value={envelope.id} />
            <Button
              type="submit"
              variant="link"
              size="sm"
              className="max-md:h-11"
              disabled={unarchivePending}
            >
              Annuler l'archivage
            </Button>
          </form>
        ) : (
          <Button
            type="button"
            variant="link"
            size="sm"
            aria-label={`Modifier ${envelope.label}`}
            onClick={() => setEditing("value")}
          >
            Modifier
          </Button>
        )}
        {unarchiveState.status === "error" ? (
          <FieldError>{unarchiveState.message}</FieldError>
        ) : null}
      </CardCell>
    </CardRow>
  );

  return (
    <EditableRow
      isEditing={editing !== null}
      onClose={cancel}
      title={
        editing === "archive" ? `Archiver « ${envelope.label} »` : `Modifier « ${envelope.label} »`
      }
      read={read}
      colSpan={4}
    >
      {editing === "archive" ? (
        <form action={archiveAction} className={SETTINGS_FORM_CLASS}>
          <input type="hidden" name="envelopeId" value={envelope.id} />
          <div className="font-medium text-sm max-md:hidden">Archiver « {envelope.label} »</div>
          <MonthChoiceSelect label="À partir de" />
          <FormActions>
            <Button type="submit" size="sm" disabled={archivePending}>
              {archivePending ? "Archivage..." : "Archiver"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={cancel}>
              Annuler
            </Button>
          </FormActions>
          <ArchiveNote label={envelope.label} />
          {archiveState.status === "error" ? (
            <FieldError className="basis-full">{archiveState.message}</FieldError>
          ) : null}
        </form>
      ) : (
        <>
          <form action={valueAction} className={SETTINGS_FORM_CLASS}>
            <input type="hidden" name="envelopeId" value={envelope.id} />
            <input type="hidden" name="mode" value={mode} />
            <FormField label="Libellé">
              {(id) => (
                <Input
                  id={id}
                  name="label"
                  defaultValue={envelope.label}
                  required
                  className="w-full md:w-40"
                />
              )}
            </FormField>
            <FormField label="Mode">
              {(id) => (
                <Select value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
                  <SelectTrigger id={id} className="w-full md:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amount">Montant fixe</SelectItem>
                    <SelectItem value="percentage">Pourcentage</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </FormField>
            {mode === "amount" ? (
              <FormField label="Montant (€)">
                {(id) => (
                  <Input
                    id={id}
                    name="amountEuros"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    defaultValue={envelope.amountEuros ?? undefined}
                    required
                    className="w-full md:w-28"
                  />
                )}
              </FormField>
            ) : (
              <FormField label="Pourcentage (%)">
                {(id) => (
                  <Input
                    id={id}
                    name="percentage"
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min="0"
                    max="100"
                    defaultValue={envelope.percentage ?? undefined}
                    required
                    className="w-full md:w-24"
                  />
                )}
              </FormField>
            )}
            <MonthChoiceSelect label="À partir de" />
            <FormActions>
              <Button type="submit" size="sm" disabled={valuePending}>
                {valuePending ? "Enregistrement..." : "Valider"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={cancel}>
                Annuler
              </Button>
            </FormActions>
            {valueState.status === "error" ? (
              <FieldError className="basis-full">{valueState.message}</FieldError>
            ) : null}
          </form>
          <OtherActions>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing("archive")}>
              Archiver
            </Button>
          </OtherActions>
        </>
      )}
    </EditableRow>
  );
}
