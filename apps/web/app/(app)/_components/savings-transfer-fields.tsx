"use client";

import type { SavingsTransferKind } from "@budget/domain";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const SAVINGS_TRANSFER_KIND_LABELS: Record<SavingsTransferKind, string> = {
  free: "Transfert libre",
  convertedUrge: "Envie convertie",
};

/**
 * Fields shared by the creation form and the inline edit form of a savings transfer (R37, R38).
 * The kind is fixed by the creation form (hidden input) and switchable when `onKindChange` is
 * given (edit form); a converted urge must say what was given up, so its label is required.
 */
export function SavingsTransferFields({
  idPrefix,
  minDate,
  maxDate,
  kind,
  onKindChange,
  initial,
}: {
  idPrefix: string;
  minDate: string;
  maxDate: string;
  kind: SavingsTransferKind;
  onKindChange?: (kind: SavingsTransferKind) => void;
  initial: { amountEuros?: number; label?: string; date: string };
}) {
  const isConvertedUrge = kind === "convertedUrge";
  return (
    <>
      {onKindChange ? (
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-kind`}>Nature</FieldLabel>
          <Select
            name="kind"
            value={kind}
            onValueChange={(value) => {
              if (value) onKindChange(value as SavingsTransferKind);
            }}
          >
            <SelectTrigger id={`${idPrefix}-kind`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SAVINGS_TRANSFER_KIND_LABELS) as SavingsTransferKind[]).map((value) => (
                <SelectItem key={value} value={value}>
                  {SAVINGS_TRANSFER_KIND_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : (
        <input type="hidden" name="kind" value={kind} />
      )}
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
        <FieldLabel htmlFor={`${idPrefix}-label`}>
          {isConvertedUrge ? "À quoi as-tu renoncé ?" : "Libellé (facultatif)"}
        </FieldLabel>
        <Input
          id={`${idPrefix}-label`}
          name="label"
          placeholder={isConvertedUrge ? "Pull en solde" : "Livret A"}
          required={isConvertedUrge}
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
