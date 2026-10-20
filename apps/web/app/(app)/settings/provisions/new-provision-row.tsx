"use client";

import { addMonths, formatMonth, parseMonth } from "@budget/domain";
import { useEffect, useState } from "react";
import { createProvisionAction } from "@/actions/provision";
import { initialVariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { EditableRow } from "@/components/editable-row";
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
import { formatMonthLabel } from "@/lib/format-month-label";
import { useFeedbackActionState } from "@/lib/use-feedback-action-state";
import { FormActions, FormField, SETTINGS_FORM_CLASS } from "../settings-form-parts";

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
  const [state, action, pending] = useFeedbackActionState(
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
    <EditableRow
      isEditing
      onClose={onDone}
      title={type === "deadline" ? "Nouvelle provision à échéance" : "Nouvelle réserve"}
      read={null}
      colSpan={6}
    >
      <form action={action} className={SETTINGS_FORM_CLASS}>
        <input type="hidden" name="type" value={type} />
        <FormField label="Libellé">
          {(id) => (
            <Input
              id={id}
              name="label"
              placeholder={type === "deadline" ? "Vacances" : "Imprévus"}
              required
              className="w-full md:w-40"
            />
          )}
        </FormField>
        <FormField label={type === "deadline" ? "Objectif (€)" : "Plafond (€)"}>
          {(id) => (
            <Input
              id={id}
              name="targetEuros"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              required
              className="w-full md:w-28"
            />
          )}
        </FormField>
        {type === "deadline" ? (
          <>
            <FormField label="Début de la constitution">
              {(id) => (
                <Select
                  name="startMonth"
                  value={startMonth}
                  onValueChange={(value) => value && setStartMonth(value)}
                >
                  <SelectTrigger id={id} className="w-full md:w-44">
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
              )}
            </FormField>
            <FormField label="Durée (mois)">
              {(id) => (
                <Input
                  id={id}
                  name="durationMonths"
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="1"
                  required
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(e.target.value)}
                  className="w-full md:w-20"
                />
              )}
            </FormField>
            {schedule ? (
              <p className="basis-full text-muted-foreground text-sm">
                Constitution de {formatMonthLabel(schedule.start).toLowerCase()} à{" "}
                {formatMonthLabel(schedule.due).toLowerCase()} · échéance en{" "}
                {formatMonthLabel(schedule.due).toLowerCase()}.
              </p>
            ) : null}
          </>
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
                required
                className="w-full md:w-28"
              />
            )}
          </FormField>
        )}
        <FormActions>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Création..." : "Ajouter"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>
            Annuler
          </Button>
        </FormActions>
        {state.status === "error" ? (
          <FieldError className="basis-full">{state.message}</FieldError>
        ) : null}
      </form>
    </EditableRow>
  );
}
