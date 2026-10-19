"use client";

import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/** Fields shared by the creation form and the inline edit form of a savings transfer (R37). */
export function SavingsTransferFields({
  idPrefix,
  minDate,
  maxDate,
  initial,
}: {
  idPrefix: string;
  minDate: string;
  maxDate: string;
  initial: { amountEuros?: number; label?: string; date: string };
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
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-label`}>Libellé (facultatif)</FieldLabel>
        <Input
          id={`${idPrefix}-label`}
          name="label"
          placeholder="Livret A"
          defaultValue={initial.label}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-date`}>Date</FieldLabel>
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
