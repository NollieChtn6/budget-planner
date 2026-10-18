"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatEuros } from "@/lib/format-money";
import { FixedEntryRow } from "./fixed-entry-row";
import { NewFixedEntryRow } from "./new-fixed-entry-row";

export type FixedEntryRowData = {
  id: string;
  label: string;
  type: "charge" | "scheduledSaving";
  archivedFrom: string | null;
  amountEuros: number | null;
};

export function FixedEntryTable({
  rows,
  monthlyTotal,
}: {
  rows: FixedEntryRowData[];
  monthlyTotal: number;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Libellé</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Montant mensuel</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <FixedEntryRow key={row.id} entry={row} />
          ))}
          {adding ? <NewFixedEntryRow onDone={() => setAdding(false)} /> : null}
          {rows.length === 0 && !adding ? (
            <TableRow>
              <TableCell colSpan={4} className="whitespace-normal text-muted-foreground">
                Aucun poste fixe pour l'instant.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAdding(true)}
          disabled={adding}
        >
          Ajouter un poste fixe
        </Button>
        <span className="text-muted-foreground text-sm">
          Total mensuel{" "}
          <strong className="font-heading text-foreground">{formatEuros(monthlyTotal)}</strong>
        </span>
      </div>
    </div>
  );
}
