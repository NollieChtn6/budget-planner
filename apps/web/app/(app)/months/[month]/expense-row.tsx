"use client";

import {
  type CalendarDate,
  type Expense,
  type ExpenseSource,
  formatCalendarDate,
  moneyToEuros,
} from "@budget/domain";
import { useActionState, useEffect, useState } from "react";
import { deleteExpenseAction, updateExpenseAction } from "@/actions/expense";
import { initialVariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function euros(amount: number): string {
  return `${amount.toFixed(2)} €`;
}

function formatDay(date: CalendarDate): string {
  return `${date.day.toString().padStart(2, "0")}/${date.month.toString().padStart(2, "0")}`;
}

function targetValue(source: ExpenseSource): string {
  return source.type === "envelope"
    ? `envelope:${source.envelopeId}`
    : `provision:${source.provisionId}`;
}

export function ExpenseRow({
  expense,
  categoryLabel,
  targetLabel,
  envelopes,
  provisions,
  categories,
  minDate,
  maxDate,
  editable,
}: {
  expense: Expense;
  categoryLabel: string;
  targetLabel: string;
  envelopes: { id: string; label: string }[];
  provisions: { id: string; label: string }[];
  categories: { id: string; label: string }[];
  minDate: string;
  maxDate: string;
  editable: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [updateState, updateAction, updatePending] = useActionState(
    updateExpenseAction,
    initialVariableEnvelopeActionState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteExpenseAction,
    initialVariableEnvelopeActionState,
  );

  useEffect(() => {
    if (updateState.status === "success") {
      setIsEditing(false);
    }
  }, [updateState.status]);

  if (!isEditing) {
    return (
      <li className="flex flex-col gap-1 border-b pb-2 last:border-b-0 last:pb-0">
        <div className="flex justify-between gap-2 text-sm">
          <span className="text-muted-foreground">{formatDay(expense.date)}</span>
          <span className="flex-1">
            {expense.place ? `${expense.place} · ` : ""}
            {expense.description ?? categoryLabel}
            <span className="text-muted-foreground"> · {targetLabel}</span>
            {expense.savingsDraw ? (
              <span className="text-destructive">
                {" "}
                · {euros(moneyToEuros(expense.savingsDraw))} financés par l'épargne
              </span>
            ) : null}
          </span>
          <span>{euros(moneyToEuros(expense.amount))}</span>
        </div>
        {editable ? (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              Modifier
            </Button>
            <form action={deleteAction}>
              <input type="hidden" name="id" value={expense.id} />
              <Button type="submit" variant="destructive" size="sm" disabled={deletePending}>
                {deletePending ? "Suppression..." : "Supprimer"}
              </Button>
            </form>
          </div>
        ) : null}
        {deleteState.status === "error" ? <FieldError>{deleteState.message}</FieldError> : null}
      </li>
    );
  }

  const defaultTarget = targetValue(expense.source);

  return (
    <li className="border-b pb-3 last:border-b-0 last:pb-0">
      <form action={updateAction}>
        <input type="hidden" name="id" value={expense.id} />
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`edit-amountEuros-${expense.id}`}>Montant (€)</FieldLabel>
            <Input
              id={`edit-amountEuros-${expense.id}`}
              name="amountEuros"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={moneyToEuros(expense.amount)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`edit-place-${expense.id}`}>Lieu</FieldLabel>
            <Input
              id={`edit-place-${expense.id}`}
              name="place"
              defaultValue={expense.place ?? ""}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`edit-description-${expense.id}`}>Description</FieldLabel>
            <Input
              id={`edit-description-${expense.id}`}
              name="description"
              defaultValue={expense.description ?? ""}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`edit-categoryId-${expense.id}`}>Catégorie</FieldLabel>
            <Select name="categoryId" defaultValue={expense.categoryId}>
              <SelectTrigger id={`edit-categoryId-${expense.id}`}>
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
            <FieldLabel htmlFor={`edit-target-${expense.id}`}>Imputer à</FieldLabel>
            <Select name="target" defaultValue={defaultTarget}>
              <SelectTrigger id={`edit-target-${expense.id}`}>
                <SelectValue placeholder="Imputer à" />
              </SelectTrigger>
              <SelectContent>
                {envelopes.length > 0 ? (
                  <SelectGroup>
                    <SelectLabel>Enveloppes</SelectLabel>
                    {envelopes.map((envelope) => (
                      <SelectItem key={envelope.id} value={`envelope:${envelope.id}`}>
                        {envelope.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ) : null}
                {provisions.length > 0 ? (
                  <SelectGroup>
                    <SelectLabel>Provisions</SelectLabel>
                    {provisions.map((provision) => (
                      <SelectItem key={provision.id} value={`provision:${provision.id}`}>
                        {provision.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ) : null}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor={`edit-date-${expense.id}`}>Date</FieldLabel>
            <Input
              id={`edit-date-${expense.id}`}
              name="date"
              type="date"
              required
              min={minDate}
              max={maxDate}
              defaultValue={formatCalendarDate(expense.date)}
            />
          </Field>
          {updateState.status === "error" ? <FieldError>{updateState.message}</FieldError> : null}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={updatePending}>
              {updatePending ? "Enregistrement..." : "Enregistrer"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)}>
              Annuler
            </Button>
          </div>
        </FieldGroup>
      </form>
    </li>
  );
}
