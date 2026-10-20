"use client";

import { cn } from "cn";
import type * as React from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";

/*
 * A table that becomes a list of cards below `md`: each row is a card, its first cell the title and
 * the other cells "label: value" lines (the label comes from the cell's `data-label`). Touching a
 * card runs the row's main action through `CardTapTarget`.
 */

export function CardTable({ className, ...props }: React.ComponentProps<typeof Table>) {
  return <Table className={cn("max-md:block", className)} {...props} />;
}

/** Column headers stay for screen readers when the cards replace them. */
export function CardTableHeader({ className, ...props }: React.ComponentProps<typeof TableHeader>) {
  return <TableHeader className={cn("max-md:sr-only", className)} {...props} />;
}

export function CardTableBody({ className, ...props }: React.ComponentProps<typeof TableBody>) {
  return <TableBody className={cn("max-md:block", className)} {...props} />;
}

export function CardRow({ className, ...props }: React.ComponentProps<typeof TableRow>) {
  return (
    <TableRow
      className={cn(
        "max-md:relative max-md:flex max-md:flex-col max-md:gap-1 max-md:px-4 max-md:py-3 max-md:active:bg-muted/50",
        className,
      )}
      {...props}
    />
  );
}

export function CardCell({
  label,
  heading = false,
  hideOnMobile = false,
  className,
  ...props
}: React.ComponentProps<typeof TableCell> & {
  /** On a card, the cell reads "label: value". */
  label?: string;
  /** The card's heading. */
  heading?: boolean;
  /** The cell only exists for the table (the card is tapped instead). */
  hideOnMobile?: boolean;
}) {
  return (
    <TableCell
      data-label={label}
      className={cn(
        "max-md:p-0 max-md:whitespace-normal max-md:empty:hidden",
        heading && "max-md:order-first max-md:text-base max-md:font-medium",
        label &&
          "max-md:flex max-md:items-baseline max-md:justify-between max-md:gap-3 max-md:text-right max-md:before:shrink-0 max-md:before:text-left max-md:before:text-muted-foreground max-md:before:content-[attr(data-label)]",
        hideOnMobile && "max-md:hidden",
        className,
      )}
      {...props}
    />
  );
}

/** Makes the whole card a button on small screens (keyboard and screen-reader friendly). */
export function CardTapTarget({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="absolute inset-0 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:hidden"
    />
  );
}
