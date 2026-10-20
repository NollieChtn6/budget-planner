"use client";

import { type ReactNode, useEffect, useRef } from "react";
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

/**
 * Shows a table row, and its edit form while `isEditing`: in place of the row from `md`, in a bottom
 * sheet over the card below it. The form is rendered once, so it keeps its state either way. A new
 * row has no `read` and is always editing.
 */
export function EditableRow({
  isEditing,
  onClose,
  title,
  read,
  colSpan,
  footer,
  children,
}: {
  isEditing: boolean;
  onClose: () => void;
  title: string;
  read: ReactNode;
  /** Number of columns the inline form spans. */
  colSpan: number;
  /** Shown under the form, in the sheet only. */
  footer?: ReactNode;
  children: ReactNode;
}) {
  const isDesktop = useIsDesktop();

  if (isEditing && isDesktop) {
    return (
      <EditRow colSpan={colSpan} onClose={onClose}>
        {children}
      </EditRow>
    );
  }

  return (
    <>
      {read}
      {isEditing ? (
        <EditSheet title={title} onClose={onClose} footer={footer}>
          {children}
        </EditSheet>
      ) : null}
    </>
  );
}

function EditRow({
  colSpan,
  onClose,
  children,
}: {
  colSpan: number;
  onClose: () => void;
  children: ReactNode;
}) {
  const formRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // The row it replaces held the focus: move it to the first field, once. Escape cancels.
  useEffect(() => {
    const form = formRef.current;
    form?.querySelector<HTMLElement>("input:not([type=hidden]), button")?.focus();
    const cancelOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    form?.addEventListener("keydown", cancelOnEscape);
    return () => form?.removeEventListener("keydown", cancelOnEscape);
  }, []);

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="whitespace-normal py-4">
        <div ref={formRef} className="max-w-3xl">
          {children}
        </div>
      </TableCell>
    </TableRow>
  );
}

function EditSheet({
  title,
  onClose,
  footer,
  children,
}: {
  title: string;
  onClose: () => void;
  footer?: ReactNode;
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
        {footer}
      </SheetContent>
    </Sheet>
  );
}
