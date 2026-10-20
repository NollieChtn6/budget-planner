"use client";

import { type Expense, type ExpenseSource, formatCalendarDate, moneyToEuros } from "@budget/domain";
import { useEffect, useState } from "react";
import { deleteExpenseAction, updateExpenseAction } from "@/actions/expense";
import { initialExpenseActionState } from "@/actions/expense-state";
import { initialVariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { Badge } from "@/components/ui/badge";
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
import { TableCell, TableRow } from "@/components/ui/table";
import { formatEuros } from "@/lib/format-money";
import { useFeedbackActionState } from "@/lib/use-feedback-action-state";
import {
  CategoryTag,
  OPERATION_COLUMN_COUNT,
  OPERATION_EDIT_FULL_WIDTH_CLASS,
  OPERATION_EDIT_GRID_CLASS,
  OperationReadRow,
  OperationRow,
  TargetChip,
} from "./operation-table-parts";
import { ProvisionExhaustionPrompt } from "./provision-exhaustion-prompt";

function targetValue(source: ExpenseSource): string {
  return source.type === "envelope"
    ? `envelope:${source.envelopeId}`
    : `provision:${source.provisionId}`;
}

export function ExpenseRow({
  expense,
  category,
  targetLabel,
  envelopes,
  provisions,
  categories,
  minDate,
  maxDate,
  editable,
}: {
  expense: Expense;
  category: { label: string; color: string } | undefined;
  targetLabel: string;
  envelopes: { id: string; label: string }[];
  provisions: { id: string; label: string }[];
  categories: { id: string; label: string }[];
  minDate: string;
  maxDate: string;
  editable: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [updateState, updateAction, updatePending] = useFeedbackActionState(
    updateExpenseAction,
    initialExpenseActionState,
  );
  const [deleteState, deleteAction, deletePending] = useFeedbackActionState(
    deleteExpenseAction,
    initialVariableEnvelopeActionState,
  );
  const [exhaustionResolved, setExhaustionResolved] = useState(false);

  useEffect(() => {
    if (updateState.status === "success") {
      setIsEditing(false);
    }
    if (updateState.provisionExhausted) {
      setExhaustionResolved(false);
    }
  }, [updateState.status, updateState.provisionExhausted]);

  if (updateState.provisionExhausted && !exhaustionResolved) {
    return (
      <TableRow className="hover:bg-transparent max-md:block">
        <TableCell colSpan={OPERATION_COLUMN_COUNT} className="whitespace-normal max-md:block">
          <ProvisionExhaustionPrompt
            provisionId={updateState.provisionExhausted.provisionId}
            label={updateState.provisionExhausted.label}
            onResolved={() => setExhaustionResolved(true)}
          />
        </TableCell>
      </TableRow>
    );
  }

  const deletion = {
    id: expense.id,
    action: deleteAction,
    pending: deletePending,
    error: deleteState.status === "error" ? deleteState.message : undefined,
  };
  const read = (
    <OperationReadRow
      date={expense.date}
      target={<TargetChip kind={expense.source.type} label={targetLabel} />}
      place={expense.place}
      description={
        <>
          {expense.description}
          {expense.savingsDraw ? (
            <>
              {" "}
              <Badge variant="negative">
                {formatEuros(moneyToEuros(expense.savingsDraw))} via l'épargne
              </Badge>
            </>
          ) : null}
        </>
      }
      category={category ? <CategoryTag {...category} /> : null}
      amount={formatEuros(moneyToEuros(expense.amount))}
      incoming={false}
      editable={editable}
      editLabel={`Modifier ${expense.place ?? expense.description ?? "la dépense"}`}
      edit={{ onEdit: () => setIsEditing(true), delete: deletion }}
    />
  );

  const defaultTarget = targetValue(expense.source);

  return (
    <OperationRow
      isEditing={isEditing}
      onClose={() => setIsEditing(false)}
      title="Modifier la dépense"
      read={read}
      deletion={deletion}
    >
      <form action={updateAction}>
        <input type="hidden" name="id" value={expense.id} />
        <FieldGroup className={OPERATION_EDIT_GRID_CLASS}>
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
                {categories.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
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
          {updateState.status === "error" ? (
            <FieldError className={OPERATION_EDIT_FULL_WIDTH_CLASS}>
              {updateState.message}
            </FieldError>
          ) : null}
          <div className={`flex gap-2 ${OPERATION_EDIT_FULL_WIDTH_CLASS}`}>
            <Button type="submit" size="sm" disabled={updatePending}>
              {updatePending ? "Enregistrement..." : "Enregistrer"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)}>
              Annuler
            </Button>
          </div>
        </FieldGroup>
      </form>
    </OperationRow>
  );
}
