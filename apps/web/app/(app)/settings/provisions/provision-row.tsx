"use client";

import { useActionState, useEffect, useState } from "react";
import {
  archiveProvisionAction,
  closeProvisionAction,
  extendProvisionAction,
  renewProvisionAction,
  unarchiveProvisionAction,
  updateProvisionGoalAction,
} from "@/actions/provision";
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
import { formatEuros } from "@/lib/format-money";
import type { ProvisionRowData } from "./provision-table";

const STATUS_LABELS: Record<ProvisionRowData["status"], string> = {
  active: "Active",
  late: "En retard",
  closed: "Clôturée",
};

export function ProvisionRow({ provision }: { provision: ProvisionRowData }) {
  const [editing, setEditing] = useState<"value" | "archive" | "extend" | null>(null);

  const [valueState, valueAction, valuePending] = useActionState(
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
  const [closeState, closeAction, closePending] = useActionState(
    closeProvisionAction,
    initialVariableEnvelopeActionState,
  );
  const [renewState, renewAction, renewPending] = useActionState(
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

  function cancel() {
    setEditing(null);
  }

  const goalErrorState = [closeState, renewState].find((s) => s.status === "error");

  if (editing === "value") {
    return (
      <TableRow onKeyDown={(e) => e.key === "Escape" && cancel()}>
        <TableCell colSpan={6} className="whitespace-normal">
          <form action={valueAction} className="flex flex-wrap items-end gap-3 py-1">
            <input type="hidden" name="provisionId" value={provision.id} />
            <input type="hidden" name="type" value={provision.type} />
            <div className="min-w-32 font-medium text-sm">{provision.label}</div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs">
                {provision.type === "deadline" ? "Objectif (€)" : "Plafond (€)"}
              </span>
              <Input
                name="targetEuros"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={provision.targetEuros}
                required
                autoFocus
                className="w-28"
              />
            </div>
            {provision.type === "deadline" ? (
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Durée (mois)</span>
                <Input
                  name="durationMonths"
                  type="number"
                  step="1"
                  min="1"
                  defaultValue={provision.durationMonths ?? undefined}
                  required
                  className="w-20"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Mensualité (€)</span>
                <Input
                  name="monthlyAmountEuros"
                  type="number"
                  step="0.01"
                  min="0.01"
                  defaultValue={provision.monthlyAmountEuros ?? undefined}
                  required
                  className="w-28"
                />
              </div>
            )}
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
        <TableCell colSpan={6} className="whitespace-normal">
          <form action={archiveAction} className="flex flex-wrap items-end gap-3 py-1">
            <input type="hidden" name="provisionId" value={provision.id} />
            <div className="font-medium text-sm">Archiver « {provision.label} »</div>
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

  if (editing === "extend") {
    return (
      <TableRow onKeyDown={(e) => e.key === "Escape" && cancel()}>
        <TableCell colSpan={6} className="whitespace-normal">
          <form action={extendAction} className="flex flex-wrap items-end gap-3 py-1">
            <input type="hidden" name="provisionId" value={provision.id} />
            <div className="font-medium text-sm">Prolonger « {provision.label} »</div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs">Jusqu'à</span>
              <Input name="newDueMonth" type="month" required autoFocus className="w-36" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={extendPending}>
                {extendPending ? "Prolongation..." : "Prolonger"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={cancel}>
                Annuler
              </Button>
            </div>
            {extendState.status === "error" ? (
              <FieldError className="basis-full">{extendState.message}</FieldError>
            ) : null}
          </form>
        </TableCell>
      </TableRow>
    );
  }

  const canCloseOrRenew = provision.type === "deadline" && provision.status !== "closed";

  return (
    <TableRow>
      <TableCell className="whitespace-normal font-medium">
        {provision.label}
        {provision.archivedFrom ? (
          <div className="font-normal text-muted-foreground text-xs">
            Archivée à partir de {provision.archivedFrom}
          </div>
        ) : null}
      </TableCell>
      <TableCell>{provision.type === "deadline" ? "À échéance" : "Réserve"}</TableCell>
      <TableCell className="text-right font-heading">
        {formatEuros(provision.targetEuros)}
      </TableCell>
      <TableCell className="whitespace-normal">
        {provision.type === "deadline" ? (
          <>
            {provision.durationMonths} mois
            <div className="text-muted-foreground text-xs">Échéance {provision.dueMonthLabel}</div>
          </>
        ) : (
          `${formatEuros(provision.monthlyAmountEuros ?? 0)} par mois`
        )}
      </TableCell>
      <TableCell>{STATUS_LABELS[provision.status]}</TableCell>
      <TableCell className="whitespace-normal text-right">
        {provision.archivedFrom ? (
          <form action={unarchiveAction} className="inline">
            <input type="hidden" name="provisionId" value={provision.id} />
            <Button type="submit" variant="link" size="sm" disabled={unarchivePending}>
              Annuler l'archivage
            </Button>
          </form>
        ) : (
          <>
            {provision.status !== "closed" ? (
              <Button type="button" variant="link" size="sm" onClick={() => setEditing("value")}>
                Modifier
              </Button>
            ) : null}
            {provision.status === "late" ? (
              <Button type="button" variant="link" size="sm" onClick={() => setEditing("extend")}>
                Prolonger
              </Button>
            ) : null}
            {canCloseOrRenew ? (
              <>
                <form action={closeAction} className="inline">
                  <input type="hidden" name="provisionId" value={provision.id} />
                  <Button type="submit" variant="link" size="sm" disabled={closePending}>
                    Clôturer
                  </Button>
                </form>
                <form action={renewAction} className="inline">
                  <input type="hidden" name="provisionId" value={provision.id} />
                  <Button type="submit" variant="link" size="sm" disabled={renewPending}>
                    Renouveler
                  </Button>
                </form>
              </>
            ) : null}
            {provision.status !== "closed" ? (
              <Button type="button" variant="link" size="sm" onClick={() => setEditing("archive")}>
                Archiver
              </Button>
            ) : null}
          </>
        )}
        {unarchiveState.status === "error" ? (
          <FieldError>{unarchiveState.message}</FieldError>
        ) : null}
        {goalErrorState ? <FieldError>{goalErrorState.message}</FieldError> : null}
      </TableCell>
    </TableRow>
  );
}
