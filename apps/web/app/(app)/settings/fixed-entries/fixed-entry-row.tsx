"use client";

import { useEffect, useState } from "react";
import {
  addFixedEntryVersionAction,
  archiveFixedEntryAction,
  unarchiveFixedEntryAction,
} from "@/actions/fixed-entry";
import { initialVariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { EditableRow } from "@/components/editable-row";
import { CardCell, CardRow, CardTapTarget } from "@/components/responsive-table";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatEuros } from "@/lib/format-money";
import { useFeedbackActionState } from "@/lib/use-feedback-action-state";
import {
  ArchiveNote,
  FormActions,
  FormField,
  MonthChoiceSelect,
  OtherActions,
  SETTINGS_FORM_CLASS,
} from "../settings-form-parts";
import type { FixedEntryRowData } from "./fixed-entry-table";

export function FixedEntryRow({ entry }: { entry: FixedEntryRowData }) {
  const [editing, setEditing] = useState<"value" | "archive" | null>(null);

  const [valueState, valueAction, valuePending] = useFeedbackActionState(
    addFixedEntryVersionAction,
    initialVariableEnvelopeActionState,
  );
  const [archiveState, archiveAction, archivePending] = useFeedbackActionState(
    archiveFixedEntryAction,
    initialVariableEnvelopeActionState,
  );
  const [unarchiveState, unarchiveAction, unarchivePending] = useFeedbackActionState(
    unarchiveFixedEntryAction,
    initialVariableEnvelopeActionState,
  );

  useEffect(() => {
    if (valueState.status === "success") setEditing(null);
  }, [valueState.status]);
  useEffect(() => {
    if (archiveState.status === "success") setEditing(null);
  }, [archiveState.status]);

  const cancel = () => setEditing(null);
  const archived = entry.archivedFromLabel !== null;

  const read = (
    <CardRow className={archived ? "text-muted-foreground" : undefined}>
      <CardCell heading className="whitespace-normal font-medium">
        {entry.label}
        {entry.archivedFromLabel ? (
          <div className="font-normal text-muted-foreground text-xs">
            Archivé à partir {entry.archivedFromLabel}
          </div>
        ) : null}
        {archived ? null : (
          <CardTapTarget label={`Modifier ${entry.label}`} onClick={() => setEditing("value")} />
        )}
      </CardCell>
      <CardCell label="Type">{entry.type === "charge" ? "Charge" : "Épargne programmée"}</CardCell>
      <CardCell label="Montant mensuel" className="text-right font-heading">
        <span>
          {entry.amountEuros !== null ? formatEuros(entry.amountEuros) : "—"}
          {entry.upcoming ? (
            <span className="block font-sans font-normal text-muted-foreground text-xs">
              puis {entry.upcoming.valueLabel} à partir {entry.upcoming.fromLabel}
            </span>
          ) : null}
        </span>
      </CardCell>
      <CardCell hideOnMobile={!archived} className="whitespace-normal text-right">
        {archived ? (
          <form action={unarchiveAction} className="inline">
            <input type="hidden" name="fixedEntryId" value={entry.id} />
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
            aria-label={`Modifier ${entry.label}`}
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
      title={editing === "archive" ? `Archiver « ${entry.label} »` : `Modifier « ${entry.label} »`}
      read={read}
      colSpan={4}
    >
      {editing === "archive" ? (
        <form action={archiveAction} className={SETTINGS_FORM_CLASS}>
          <input type="hidden" name="fixedEntryId" value={entry.id} />
          <div className="font-medium text-sm max-md:hidden">Archiver « {entry.label} »</div>
          <MonthChoiceSelect label="À partir de" />
          <FormActions>
            <Button type="submit" size="sm" disabled={archivePending}>
              {archivePending ? "Archivage..." : "Archiver"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={cancel}>
              Annuler
            </Button>
          </FormActions>
          <ArchiveNote label={entry.label} />
          {archiveState.status === "error" ? (
            <FieldError className="basis-full">{archiveState.message}</FieldError>
          ) : null}
        </form>
      ) : (
        <>
          <form action={valueAction} className={SETTINGS_FORM_CLASS}>
            <input type="hidden" name="fixedEntryId" value={entry.id} />
            <FormField label="Libellé">
              {(id) => (
                <Input
                  id={id}
                  name="label"
                  defaultValue={entry.label}
                  required
                  className="w-full md:w-40"
                />
              )}
            </FormField>
            <FormField label="Montant (€)">
              {(id) => (
                <Input
                  id={id}
                  name="amountEuros"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  defaultValue={entry.amountEuros ?? undefined}
                  required
                  className="w-full md:w-28"
                />
              )}
            </FormField>
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
