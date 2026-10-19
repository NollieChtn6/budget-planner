"use client";

import { addMonths, formatMonth, parseMonth } from "@budget/domain";
import { useActionState, useEffect, useState } from "react";
import { createProvisionAction } from "@/actions/provision";
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
import { formatMonthLabel } from "@/lib/format-month-label";

const START_MONTH_CHOICES = 12;

export function NewProvisionRow({
  type,
  activeMonth,
  onDone,
}: {
  type: "deadline" | "reserve";
  activeMonth: string;
  onDone: () => void;
}) {
  const [startMonth, setStartMonth] = useState(activeMonth);
  const [durationMonths, setDurationMonths] = useState("");
  const [state, action, pending] = useActionState(
    createProvisionAction,
    initialVariableEnvelopeActionState,
  );

  useEffect(() => {
    if (state.status === "success") onDone();
  }, [state.status, onDone]);

  const firstMonth = parseMonth(activeMonth);
  const startMonthOptions = Array.from({ length: START_MONTH_CHOICES }, (_, index) =>
    addMonths(firstMonth, index),
  );
  const duration = Number(durationMonths);
  const schedule =
    Number.isInteger(duration) && duration > 0
      ? {
          start: parseMonth(startMonth),
          due: addMonths(parseMonth(startMonth), duration - 1),
        }
      : null;

  return (
    <TableRow onKeyDown={(e) => e.key === "Escape" && onDone()}>
      <TableCell colSpan={6} className="whitespace-normal">
        <form action={action} className="flex flex-wrap items-end gap-3 py-1">
          <input type="hidden" name="type" value={type} />
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">Libellé</span>
            <Input
              name="label"
              placeholder={type === "deadline" ? "Vacances" : "Imprévus"}
              required
              autoFocus
              className="w-40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">
              {type === "deadline" ? "Objectif (€)" : "Plafond (€)"}
            </span>
            <Input
              name="targetEuros"
              type="number"
              step="0.01"
              min="0.01"
              required
              className="w-28"
            />
          </div>
          {type === "deadline" ? (
            <>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Début de la constitution</span>
                <Select
                  name="startMonth"
                  value={startMonth}
                  onValueChange={(value) => value && setStartMonth(value)}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {startMonthOptions.map((month) => (
                      <SelectItem key={formatMonth(month)} value={formatMonth(month)}>
                        {formatMonthLabel(month)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Durée (mois)</span>
                <Input
                  name="durationMonths"
                  type="number"
                  step="1"
                  min="1"
                  required
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(e.target.value)}
                  className="w-20"
                />
              </div>
              {schedule ? (
                <p className="basis-full text-muted-foreground text-xs">
                  Constitution de {formatMonthLabel(schedule.start).toLowerCase()} à{" "}
                  {formatMonthLabel(schedule.due).toLowerCase()} · échéance en{" "}
                  {formatMonthLabel(schedule.due).toLowerCase()}.
                </p>
              ) : null}
            </>
          ) : (
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs">Mensualité (€)</span>
              <Input
                name="monthlyAmountEuros"
                type="number"
                step="0.01"
                min="0.01"
                required
                className="w-28"
              />
            </div>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Création..." : "Ajouter"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onDone}>
              Annuler
            </Button>
          </div>
          {state.status === "error" ? (
            <FieldError className="basis-full">{state.message}</FieldError>
          ) : null}
        </form>
      </TableCell>
    </TableRow>
  );
}
