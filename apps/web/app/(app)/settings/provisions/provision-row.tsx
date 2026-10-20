"use client";

import { useEffect, useState } from "react";
import {
  archiveProvisionAction,
  closeProvisionAction,
  extendProvisionAction,
  renewProvisionAction,
  unarchiveProvisionAction,
  updateProvisionGoalAction,
} from "@/actions/provision";
import { initialVariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { ConfirmForm } from "@/components/confirm-form";
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
import type { ProvisionRowData } from "./provision-table";

const STATUS_LABELS: Record<ProvisionRowData["status"], string> = {
  active: "Active",
  late: "En retard",
  closed: "Clôturée",
};

type Editing = "value" | "archive" | "extend";

export function ProvisionRow({ provision }: { provision: ProvisionRowData }) {
  const [editing, setEditing] = useState<Editing | null>(null);

  const [valueState, valueAction, valuePending] = useFeedbackActionState(
    updateProvisionGoalAction,
    initialVariableEnvelopeActionState,
  );
  const [archiveState, archiveAction, archivePending] = useFeedbackActionState(
    archiveProvisionAction,
    initialVariableEnvelopeActionState,
  );
  const [unarchiveState, unarchiveAction, unarchivePending] = useFeedbackActionState(
    unarchiveProvisionAction,
    initialVariableEnvelopeActionState,
  );
  const [extendState, extendAction, extendPending] = useFeedbackActionState(
    extendProvisionAction,
    initialVariableEnvelopeActionState,
  );
  const [closeState, closeAction, closePending] = useFeedbackActionState(
    closeProvisionAction,
    initialVariableEnvelopeActionState,
  );
  const [renewState, renewAction, renewPending] = useFeedbackActionState(
    renewProvisionAction,
    initialVariableEnvelopeActionState,
  );

  useEffect(() => {
    if (valueState.status === "success") setEditing(null);
  }, [valueState.status]);
  useEffect(() => {
    if (archiveState.status === "success") setEditing(null);
  }, [archiveState.status]);
  useEffect(() => {
    if (extendState.status === "success") setEditing(null);
  }, [extendState.status]);
  useEffect(() => {
    if (closeState.status === "success" || renewState.status === "success") setEditing(null);
  }, [closeState.status, renewState.status]);

  const cancel = () => setEditing(null);
  const archived = provision.archivedFromLabel !== null;
  const canEdit = !archived && provision.status !== "closed";
  const canCloseOrRenew = provision.type === "deadline" && provision.status !== "closed";
  const actionError = [closeState, renewState].find((state) => state.status === "error");

  const titles: Record<Editing, string> = {
    value: `Modifier « ${provision.label} »`,
    archive: `Archiver « ${provision.label} »`,
    extend: `Prolonger « ${provision.label} »`,
  };

  const read = (
    <CardRow className={archived ? "text-muted-foreground" : undefined}>
      <CardCell heading className="whitespace-normal font-medium">
        {provision.label}
        {provision.archivedFromLabel ? (
          <div className="font-normal text-muted-foreground text-xs">
            Archivée à partir {provision.archivedFromLabel}
          </div>
        ) : null}
        {canEdit ? (
          <CardTapTarget
            label={`Modifier ${provision.label}`}
            onClick={() => setEditing("value")}
          />
        ) : null}
      </CardCell>
      <CardCell label="Type">{provision.type === "deadline" ? "À échéance" : "Réserve"}</CardCell>
      <CardCell label="Objectif" className="text-right font-heading">
        {formatEuros(provision.targetEuros)}
      </CardCell>
      <CardCell
        label={provision.type === "deadline" ? "Durée" : "Mensualité"}
        className="whitespace-normal"
      >
        {provision.type === "deadline" ? (
          <span>
            {provision.durationMonths} mois
            <span className="block text-muted-foreground text-xs">
              Échéance {provision.dueMonthLabel}
            </span>
          </span>
        ) : (
          <span>{formatEuros(provision.monthlyAmountEuros ?? 0)} par mois</span>
        )}
      </CardCell>
      <CardCell label="Statut">{STATUS_LABELS[provision.status]}</CardCell>
      <CardCell hideOnMobile={!archived} className="whitespace-normal text-right">
        {archived ? (
          <form action={unarchiveAction} className="inline">
            <input type="hidden" name="provisionId" value={provision.id} />
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
        ) : canEdit ? (
          <Button
            type="button"
            variant="link"
            size="sm"
            aria-label={`Modifier ${provision.label}`}
            onClick={() => setEditing("value")}
          >
            Modifier
          </Button>
        ) : null}
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
      title={titles[editing ?? "value"]}
      read={read}
      colSpan={6}
    >
      {editing === "archive" ? (
        <form action={archiveAction} className={SETTINGS_FORM_CLASS}>
          <input type="hidden" name="provisionId" value={provision.id} />
          <div className="font-medium text-sm max-md:hidden">Archiver « {provision.label} »</div>
          <MonthChoiceSelect label="À partir de" />
          <FormActions>
            <Button type="submit" size="sm" disabled={archivePending}>
              {archivePending ? "Archivage..." : "Archiver"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={cancel}>
              Annuler
            </Button>
          </FormActions>
          <ArchiveNote label={provision.label} />
          {archiveState.status === "error" ? (
            <FieldError className="basis-full">{archiveState.message}</FieldError>
          ) : null}
        </form>
      ) : editing === "extend" ? (
        <form action={extendAction} className={SETTINGS_FORM_CLASS}>
          <input type="hidden" name="provisionId" value={provision.id} />
          <div className="font-medium text-sm max-md:hidden">Prolonger « {provision.label} »</div>
          <FormField label="Jusqu'à">
            {(id) => (
              <Input id={id} name="newDueMonth" type="month" required className="w-full md:w-36" />
            )}
          </FormField>
          <FormActions>
            <Button type="submit" size="sm" disabled={extendPending}>
              {extendPending ? "Prolongation..." : "Prolonger"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={cancel}>
              Annuler
            </Button>
          </FormActions>
          {extendState.status === "error" ? (
            <FieldError className="basis-full">{extendState.message}</FieldError>
          ) : null}
        </form>
      ) : (
        <>
          <form action={valueAction} className={SETTINGS_FORM_CLASS}>
            <input type="hidden" name="provisionId" value={provision.id} />
            <input type="hidden" name="type" value={provision.type} />
            <FormField label={provision.type === "deadline" ? "Objectif (€)" : "Plafond (€)"}>
              {(id) => (
                <Input
                  id={id}
                  name="targetEuros"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  defaultValue={provision.targetEuros}
                  required
                  className="w-full md:w-28"
                />
              )}
            </FormField>
            {provision.type === "deadline" ? (
              <FormField label="Durée (mois)">
                {(id) => (
                  <Input
                    id={id}
                    name="durationMonths"
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min="1"
                    defaultValue={provision.durationMonths ?? undefined}
                    required
                    className="w-full md:w-20"
                  />
                )}
              </FormField>
            ) : (
              <FormField label="Mensualité (€)">
                {(id) => (
                  <Input
                    id={id}
                    name="monthlyAmountEuros"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    defaultValue={provision.monthlyAmountEuros ?? undefined}
                    required
                    className="w-full md:w-28"
                  />
                )}
              </FormField>
            )}
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
            {provision.status === "late" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setEditing("extend")}
              >
                Prolonger
              </Button>
            ) : null}
            {canCloseOrRenew ? (
              <>
                <ConfirmForm
                  action={closeAction}
                  fields={{ provisionId: provision.id }}
                  pending={closePending}
                  trigger="Clôturer"
                  question={`Clôturer « ${provision.label} » ? Elle disparaît des mois suivants.`}
                  confirm="Oui, clôturer"
                  pendingLabel="Clôture..."
                  decline="Retour"
                  destructive={false}
                  visibleQuestion
                />
                <ConfirmForm
                  action={renewAction}
                  fields={{ provisionId: provision.id }}
                  pending={renewPending}
                  trigger="Renouveler"
                  question={`Renouveler « ${provision.label} » ? Elle est clôturée et un nouveau cycle démarre le mois suivant, avec le même objectif et la même durée.`}
                  confirm="Oui, renouveler"
                  pendingLabel="Renouvellement..."
                  decline="Retour"
                  destructive={false}
                  visibleQuestion
                />
              </>
            ) : null}
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing("archive")}>
              Archiver
            </Button>
          </OtherActions>
          {actionError ? <FieldError>{actionError.message}</FieldError> : null}
        </>
      )}
    </EditableRow>
  );
}
