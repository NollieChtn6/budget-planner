"use client";

import {
  computeMonthlyTarget,
  dueMonth,
  formatMonth,
  type Money,
  moneyFromCents,
  moneyToEuros,
  type Provision,
  parseMonth,
} from "@budget/domain";
import { useActionState } from "react";
import {
  archiveProvisionAction,
  extendProvisionAction,
  unarchiveProvisionAction,
  updateProvisionGoalAction,
} from "@/actions/provision";
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
import { formatEuros } from "@/lib/format-money";

const TYPE_LABELS: Record<Provision["type"], string> = {
  deadline: "À échéance",
  reserve: "Réserve",
};

function currentMonth() {
  const now = new Date();
  const year = now.getFullYear().toString().padStart(4, "0");
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  return parseMonth(`${year}-${month}`);
}

/**
 * R18/R21 preview, assuming a balance of 0: Contribution doesn't exist yet
 * (issue #9), so there's no real balance to read. Purely illustrative — lets
 * this test screen show the calculation working, not the actual target.
 */
function previewTarget(provision: Provision): Money | null {
  try {
    return computeMonthlyTarget(provision, currentMonth(), moneyFromCents(0));
  } catch {
    return null;
  }
}

export function ProvisionCard({ provision }: { provision: Provision }) {
  const [updateGoalState, updateGoalAction, updateGoalPending] = useActionState(
    updateProvisionGoalAction,
    initialVariableEnvelopeActionState,
  );
  const [archiveState, archiveAction, archivePending] = useActionState(
    archiveProvisionAction,
    initialVariableEnvelopeActionState,
  );
  const [unarchiveState, unarchiveAction, unarchivePending] = useActionState(
    unarchiveProvisionAction,
    initialVariableEnvelopeActionState,
  );
  const [extendState, extendAction, extendPending] = useActionState(
    extendProvisionAction,
    initialVariableEnvelopeActionState,
  );

  const target = previewTarget(provision);
  const isLate = provision.type === "deadline" && provision.status === "late";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{provision.label}</CardTitle>
        <CardDescription>{TYPE_LABELS[provision.type]}</CardDescription>
        {provision.type === "deadline" ? (
          <CardDescription>
            Échéance {formatMonth(dueMonth(provision))} ({provision.durationMonths} mois depuis{" "}
            {formatMonth(provision.startMonth)})
          </CardDescription>
        ) : null}
        {isLate ? <CardDescription className="text-destructive">En retard</CardDescription> : null}
        {provision.archivedFrom ? (
          <CardDescription>
            Archivée à partir de {formatMonth(provision.archivedFrom)}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-col gap-1 text-sm">
          <li>
            {provision.type === "deadline" ? "Objectif" : "Plafond"} :{" "}
            {formatEuros(moneyToEuros(provision.target))}
          </li>
          {provision.type === "reserve" ? (
            <li>Mensualité : {formatEuros(moneyToEuros(provision.monthlyAmount))}</li>
          ) : null}
          <li className="text-muted-foreground">
            Cible ce mois-ci (solde supposé 0 €) :{" "}
            {target ? formatEuros(moneyToEuros(target)) : "indisponible (échéance dépassée)"}
          </li>
        </ul>

        <form action={updateGoalAction} className="flex flex-col gap-3 border-t pt-3">
          <Input type="hidden" name="provisionId" value={provision.id} />
          <Input type="hidden" name="type" value={provision.type} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`targetEuros-${provision.id}`}>
                {provision.type === "deadline" ? "Objectif (€)" : "Plafond (€)"}
              </FieldLabel>
              <Input
                id={`targetEuros-${provision.id}`}
                name="targetEuros"
                type="number"
                step="0.01"
                min="0.01"
                required
              />
            </Field>
            {provision.type === "deadline" ? (
              <Field>
                <FieldLabel htmlFor={`durationMonths-${provision.id}`}>Durée (mois)</FieldLabel>
                <Input
                  id={`durationMonths-${provision.id}`}
                  name="durationMonths"
                  type="number"
                  step="1"
                  min="1"
                  required
                />
              </Field>
            ) : (
              <Field>
                <FieldLabel htmlFor={`monthlyAmountEuros-${provision.id}`}>
                  Mensualité (€)
                </FieldLabel>
                <Input
                  id={`monthlyAmountEuros-${provision.id}`}
                  name="monthlyAmountEuros"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                />
              </Field>
            )}
            {updateGoalState.status === "error" ? (
              <FieldError>{updateGoalState.message}</FieldError>
            ) : null}
            {updateGoalState.status === "success" ? (
              <p className="text-sm text-muted-foreground">{updateGoalState.message}</p>
            ) : null}
            <Button type="submit" variant="outline" disabled={updateGoalPending}>
              {updateGoalPending ? "Mise à jour..." : "Modifier l'objectif"}
            </Button>
          </FieldGroup>
        </form>

        {isLate ? (
          <form action={extendAction} className="flex flex-col gap-3 border-t pt-3">
            <Input type="hidden" name="provisionId" value={provision.id} />
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`extend-newDueMonth-${provision.id}`}>
                  Prolonger jusqu'à
                </FieldLabel>
                <Input
                  id={`extend-newDueMonth-${provision.id}`}
                  name="newDueMonth"
                  type="month"
                  required
                />
              </Field>
              {extendState.status === "error" ? (
                <FieldError>{extendState.message}</FieldError>
              ) : null}
              <Button type="submit" variant="outline" disabled={extendPending}>
                {extendPending ? "Prolongation..." : "Prolonger"}
              </Button>
            </FieldGroup>
          </form>
        ) : null}

        {provision.archivedFrom ? (
          <form action={unarchiveAction} className="border-t pt-3">
            <Input type="hidden" name="provisionId" value={provision.id} />
            {unarchiveState.status === "error" ? (
              <FieldError>{unarchiveState.message}</FieldError>
            ) : null}
            <Button type="submit" variant="outline" disabled={unarchivePending}>
              {unarchivePending ? "Désarchivage..." : "Désarchiver"}
            </Button>
          </form>
        ) : (
          <form action={archiveAction} className="flex flex-col gap-3 border-t pt-3">
            <Input type="hidden" name="provisionId" value={provision.id} />
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`archive-effectiveFrom-${provision.id}`}>
                  Archiver à partir de
                </FieldLabel>
                <Select name="effectiveFrom" defaultValue="current">
                  <SelectTrigger id={`archive-effectiveFrom-${provision.id}`}>
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
