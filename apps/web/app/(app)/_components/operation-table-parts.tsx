"use client";

import type { CalendarDate } from "@budget/domain";
import { Landmark, Mail, PiggyBank } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TableCell, TableRow } from "@/components/ui/table";
import { MOBILE_TOUCH_TARGETS } from "@/lib/touch-targets";
import { useIsDesktop } from "@/lib/use-is-desktop";

/** Date, Imputé à, Lieu, Description, Catégorie, Montant, then Actions on an editable month (docs/ui maquette, opsTable). */
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

const TARGET_KINDS = {
  envelope: { Icon: Mail, name: "Enveloppe", variant: "default" },
  provision: { Icon: PiggyBank, name: "Provision", variant: "accent" },
  savings: { Icon: Landmark, name: null, variant: "default" },
} as const;

/** "Imputé à": the icon and the screen-reader prefix tell envelope, provision and savings apart, not the colour alone. */
export function TargetChip({ kind, label }: { kind: keyof typeof TARGET_KINDS; label: string }) {
  const { Icon, name, variant } = TARGET_KINDS[kind];
  return (
    <Badge variant={variant} className="max-w-full">
      <Icon aria-hidden className="size-3 shrink-0" />
      {name ? <span className="sr-only">{name} : </span> : null}
      <span className="truncate">{label}</span>
    </Badge>
  );
}

export function MutedText({ children }: { children: ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>;
}

type DeleteControls = {
  id: string;
  action: (formData: FormData) => void;
  pending: boolean;
  error?: string;
};

/**
 * One line of the operations table. Below `md` it is a card (Imputé à and Montant on top, then Lieu
 * and Description, then Date and Catégorie) and touching it opens the edit sheet; from `md` it is a
 * table row with Modifier / Supprimer at its end, as in the maquette.
 */
export function OperationReadRow({
  date,
  target,
  place,
  description,
  category,
  amount,
  incoming,
  editable,
  editLabel,
  edit,
}: {
  date: CalendarDate;
  target: ReactNode;
  place?: ReactNode;
  description?: ReactNode;
  category?: ReactNode;
  /** Already formatted, without sign. */
  amount: string;
  incoming: boolean;
  /** The month accepts changes: the row reserves its actions column. */
  editable: boolean;
  /** Names the row for assistive technology, e.g. "Modifier Carrefour". */
  editLabel: string;
  /** Absent when the operation cannot be modified, even in an editable month. */
  edit?: { onEdit: () => void; delete: DeleteControls };
}) {
  const day = formatDay(date);
  return (
    <TableRow className="max-md:relative max-md:grid max-md:grid-cols-[auto_1fr_auto] max-md:items-baseline max-md:gap-x-2 max-md:gap-y-1 max-md:px-4 max-md:py-3 max-md:active:bg-muted/50">
      <TableCell className="tabular-nums max-md:order-5 max-md:p-0 max-md:text-xs max-md:text-muted-foreground">
        {day}
        {editable && edit ? (
          <button
            type="button"
            onClick={edit.onEdit}
            aria-label={`${editLabel}, ${day}, ${amount}`}
            className="absolute inset-0 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:hidden"
          />
        ) : null}
      </TableCell>
      <TableCell className="max-md:order-1 max-md:col-span-2 max-md:min-w-0 max-md:p-0">
        {target}
      </TableCell>
      <TableCell className="whitespace-normal break-words max-md:order-3 max-md:col-span-3 max-md:p-0 max-md:font-medium max-md:empty:hidden">
        {place}
      </TableCell>
      <TableCell className="min-w-40 whitespace-normal break-words max-md:order-4 max-md:col-span-3 max-md:min-w-0 max-md:p-0 max-md:text-muted-foreground max-md:empty:hidden">
        {description}
      </TableCell>
      <TableCell className="max-md:order-6 max-md:col-span-2 max-md:p-0 max-md:text-xs max-md:text-muted-foreground max-md:empty:hidden">
        {category}
      </TableCell>
      <TableCell
        className={`text-right tabular-nums max-md:order-2 max-md:p-0 max-md:text-base max-md:font-medium ${incoming ? "text-positive" : ""}`}
      >
        {incoming ? "+" : "−"}
        {amount}
      </TableCell>
      {editable ? (
        edit ? (
          <OperationActions editLabel={editLabel} onEdit={edit.onEdit} deletion={edit.delete} />
        ) : (
          <TableCell className="max-md:hidden" />
        )
      ) : null}
    </TableRow>
  );
}

/** Modifier / Supprimer at the end of the row (desktop only; on a card they live in the edit sheet). */
function OperationActions({
  editLabel,
  onEdit,
  deletion,
}: {
  editLabel: string;
  onEdit: () => void;
  deletion: DeleteControls;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <TableCell className="text-right max-md:hidden">
      <div className="flex justify-end gap-1">
        {confirming ? null : (
          <Button type="button" variant="ghost" size="sm" onClick={onEdit} aria-label={editLabel}>
            Modifier
          </Button>
        )}
        <DeleteControl deletion={deletion} onConfirmingChange={setConfirming} />
      </div>
      {deletion.error ? (
        <FieldError className="ml-auto max-w-64 whitespace-normal text-left">
          {deletion.error}
        </FieldError>
      ) : null}
    </TableCell>
  );
}

/**
 * Supprimer takes two steps: a first press asks, a second one deletes (no undo on a ledger line).
 * Focus moves to the safe answer when asked, and back to Supprimer when the user declines.
 */
function DeleteControl({
  deletion,
  block = false,
  onConfirmingChange,
}: {
  deletion: DeleteControls;
  /** Full-width layout, for the edit sheet. */
  block?: boolean;
  onConfirmingChange?: (confirming: boolean) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const declineRef = useRef<HTMLButtonElement>(null);
  const hasAsked = useRef(false);

  useEffect(() => {
    if (confirming) {
      hasAsked.current = true;
      declineRef.current?.focus();
    } else if (hasAsked.current) {
      triggerRef.current?.focus();
    }
  }, [confirming]);

  function setAsking(next: boolean) {
    setConfirming(next);
    onConfirmingChange?.(next);
  }

  return (
    <form
      action={deletion.action}
      className={block ? "flex flex-col gap-2" : "flex items-center gap-1"}
    >
      <input type="hidden" name="id" value={deletion.id} />
      {confirming ? (
        <>
          {block ? (
            <span className="text-sm">Supprimer définitivement cette opération ?</span>
          ) : (
            <span className="sr-only">Supprimer cette opération ?</span>
          )}
          <div className={block ? "grid grid-cols-2 gap-2" : "flex gap-1"}>
            <Button
              type="submit"
              variant="destructive"
              size={block ? "default" : "sm"}
              disabled={deletion.pending}
            >
              {deletion.pending ? "Suppression..." : block ? "Supprimer" : "Oui, supprimer"}
            </Button>
            <Button
              ref={declineRef}
              type="button"
              variant={block ? "outline" : "ghost"}
              size={block ? "default" : "sm"}
              onClick={() => setAsking(false)}
            >
              Garder
            </Button>
          </div>
        </>
      ) : (
        <Button
          ref={triggerRef}
          type="button"
          variant={block ? "outline" : "ghost"}
          size={block ? "default" : "sm"}
          className={block ? "w-full text-destructive" : "hover:text-destructive"}
          onClick={() => setAsking(true)}
        >
          {block ? "Supprimer l'opération" : "Supprimer"}
        </Button>
      )}
    </form>
  );
}

/**
 * Shows an operation, and its edit form while `isEditing`: in place of the row from `md`, in a
 * bottom sheet over the card below it. The form is rendered once, so it keeps its state either way.
 */
export function OperationRow({
  isEditing,
  onClose,
  title,
  read,
  deletion,
  children,
}: {
  isEditing: boolean;
  onClose: () => void;
  title: string;
  read: ReactNode;
  /** Shown in the sheet only: on a table row, Supprimer sits next to Modifier. */
  deletion?: DeleteControls;
  children: ReactNode;
}) {
  const isDesktop = useIsDesktop();

  if (isEditing && isDesktop) {
    return <OperationEditRow onClose={onClose}>{children}</OperationEditRow>;
  }

  return (
    <>
      {read}
      {isEditing ? (
        <OperationEditSheet title={title} onClose={onClose} deletion={deletion}>
          {children}
        </OperationEditSheet>
      ) : null}
    </>
  );
}

/** A row's edit form replaces the read-only row; it is capped so it stays within the screen when the table scrolls sideways. */
export function OperationEditRow({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  const formRef = useRef<HTMLDivElement>(null);

  // The row it replaces held the focus: move it to the first field. Escape cancels.
  useEffect(() => {
    const form = formRef.current;
    form?.querySelector<HTMLElement>("input:not([type=hidden]), button")?.focus();
    const cancelOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    form?.addEventListener("keydown", cancelOnEscape);
    return () => form?.removeEventListener("keydown", cancelOnEscape);
  }, [onClose]);

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={OPERATION_COLUMN_COUNT} className="whitespace-normal py-4">
        <div ref={formRef} className="max-w-3xl">
          {children}
        </div>
      </TableCell>
    </TableRow>
  );
}

function OperationEditSheet({
  title,
  onClose,
  deletion,
  children,
}: {
  title: string;
  onClose: () => void;
  deletion?: DeleteControls;
  children: ReactNode;
}) {
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className={`max-h-[90dvh] overflow-y-auto rounded-t-xl pb-[env(safe-area-inset-bottom)] ${MOBILE_TOUCH_TARGETS}`}
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription className="sr-only">
            Modifie les champs puis enregistre, ou ferme pour annuler.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">{children}</div>
        {deletion ? (
          <div className="flex flex-col gap-2 border-t px-4 py-4">
            <DeleteControl deletion={deletion} block />
            {deletion.error ? <FieldError>{deletion.error}</FieldError> : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

/** Lays the fields of an edit form out on a grid, with the buttons and messages on full-width lines. */
export const OPERATION_EDIT_GRID_CLASS = "grid gap-3 sm:grid-cols-2 lg:grid-cols-3";
export const OPERATION_EDIT_FULL_WIDTH_CLASS = "sm:col-span-2 lg:col-span-3";
