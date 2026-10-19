"use client";

import { useState } from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ExpenseLinkOption } from "@/lib/expense-link-options";

const NO_EXPENSE = "none";

/**
 * Fields shared by the creation form and the inline edit form of a
 * reimbursement (R35). Picking an origin expense pre-fills the category with
 * the expense's own, which stays editable.
 */
export function ReimbursementFields({
  idPrefix,
  categories,
  expenseOptions,
  minDate,
  maxDate,
  initial,
}: {
  idPrefix: string;
  categories: { id: string; label: string }[];
  expenseOptions: ExpenseLinkOption[];
  minDate: string;
  maxDate: string;
  initial: {
    amountEuros?: number;
    label?: string;
    date: string;
    categoryId?: string;
    expenseId?: string;
  };
}) {
  // An origin expense older than the proposed ones must still be shown when editing.
  const options =
    initial.expenseId && !expenseOptions.some((option) => option.id === initial.expenseId)
      ? [...expenseOptions, { id: initial.expenseId, categoryId: "", label: "Dépense liée" }]
      : expenseOptions;
  const [categoryId, setCategoryId] = useState(initial.categoryId ?? categories[0]?.id);
  const [expenseId, setExpenseId] = useState(initial.expenseId ?? NO_EXPENSE);

  function selectExpense(value: string | null) {
    const next = value ?? NO_EXPENSE;
    setExpenseId(next);
    const linked = options.find((option) => option.id === next);
    if (linked && categories.some((category) => category.id === linked.categoryId)) {
      setCategoryId(linked.categoryId);
    }
  }

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
          defaultValue={initial.amountEuros}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-label`}>Libellé</FieldLabel>
        <Input
          id={`${idPrefix}-label`}
          name="label"
          placeholder="Mutuelle"
          required
          defaultValue={initial.label}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-expenseId`}>Dépense d'origine (facultatif)</FieldLabel>
        <Select name="expenseId" value={expenseId} onValueChange={selectExpense}>
          <SelectTrigger id={`${idPrefix}-expenseId`}>
            <SelectValue placeholder="Aucune" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_EXPENSE}>Aucune</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-categoryId`}>Catégorie</FieldLabel>
        <Select
          name="categoryId"
          value={categoryId}
          onValueChange={(value) => setCategoryId(value ?? undefined)}
        >
          <SelectTrigger id={`${idPrefix}-categoryId`}>
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
