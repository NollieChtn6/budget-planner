"use client";

import type { CalendarDate } from "@budget/domain";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { TableCell, TableRow } from "@/components/ui/table";

/** Date, Lieu, Description, Catégorie, Imputé à, Montant, then Actions on an editable month (docs/ui maquette, opsTable). */
export const OPERATION_COLUMN_COUNT = 7;

export function formatDay(date: CalendarDate): string {
  return `${date.day.toString().padStart(2, "0")}/${date.month.toString().padStart(2, "0")}`;
}

/** A category is always shown with its colour dot and its label (charte). */
export function CategoryTag({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

/** "Imputé à" for a provision: the accent dot tells it apart from an envelope. */
export function ProvisionTarget({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-accent" />
      {label}
    </span>
  );
}

export function MutedText({ children }: { children: ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>;
}

/** Money coming in is signed "+" and green, money going out "−". */
export function AmountCell({ children, incoming }: { children: ReactNode; incoming: boolean }) {
  return (
    <TableCell className={`text-right tabular-nums ${incoming ? "text-positive" : ""}`}>
      {incoming ? "+" : "−"}
      {children}
    </TableCell>
  );
}

/** Modifier / Supprimer, as in the maquette: text buttons at the end of the row. */
export function OperationActions({
  onEdit,
  deleteAction,
  deletePending,
  id,
  error,
}: {
  onEdit: () => void;
  deleteAction: (formData: FormData) => void;
  deletePending: boolean;
  id: string;
  error?: string;
}) {
  return (
    <TableCell className="text-right">
      <div className="flex justify-end gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
          Modifier
        </Button>
        <form action={deleteAction}>
          <input type="hidden" name="id" value={id} />
          <Button type="submit" variant="ghost" size="sm" disabled={deletePending}>
            {deletePending ? "Suppression..." : "Supprimer"}
          </Button>
        </form>
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
    </TableCell>
  );
}

/** A row's edit form replaces the read-only row; it is capped so it stays within the screen when the table scrolls sideways. */
export function OperationEditRow({ children }: { children: ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={OPERATION_COLUMN_COUNT} className="whitespace-normal py-4">
        <div className="max-w-3xl">{children}</div>
      </TableCell>
    </TableRow>
  );
}

/** Lays the fields of an edit form out on a grid, with the buttons and messages on full-width lines. */
export const OPERATION_EDIT_GRID_CLASS = "grid gap-3 sm:grid-cols-2 lg:grid-cols-3";
export const OPERATION_EDIT_FULL_WIDTH_CLASS = "sm:col-span-2 lg:col-span-3";
