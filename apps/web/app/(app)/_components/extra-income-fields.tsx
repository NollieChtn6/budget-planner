"use client";

import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/** Fields shared by the creation form and the inline edit form of an extra income (R36). */
export function ExtraIncomeFields({
  idPrefix,
  minDate,
  maxDate,
  initial,
  onAmountChange,
}: {
  idPrefix: string;
  minDate: string;
  maxDate: string;
  initial: { amountEuros?: number; label?: string; date: string };
  onAmountChange?: (amountEuros: number) => void;
}) {
  return (
    <>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-amountEuros`}>Montant (€)</FieldLabel>
        <Input
          id={`${idPrefix}-amountEuros`}
          name="amountEuros"
          type="number"
          step="0.01"
          min="0"
          required
          autoFocus
          defaultValue={initial.amountEuros}
          onChange={(event) => onAmountChange?.(event.target.valueAsNumber)}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-label`}>Libellé</FieldLabel>
        <Input
          id={`${idPrefix}-label`}
          name="label"
          placeholder="Chèque cadeau"
          required
          defaultValue={initial.label}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-date`}>Date de réception</FieldLabel>
        <Input
          id={`${idPrefix}-date`}
          name="date"
          type="date"
          required
          min={minDate}
          max={maxDate}
          defaultValue={initial.date}
        />
      </Field>
    </>
  );
}
