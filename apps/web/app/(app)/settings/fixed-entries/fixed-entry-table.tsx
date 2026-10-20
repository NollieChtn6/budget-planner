"use client";

import { useState } from "react";
import { CardTable, CardTableBody, CardTableHeader } from "@/components/responsive-table";
import { Button } from "@/components/ui/button";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { formatEuros } from "@/lib/format-money";
import { ArchivedToggle } from "../settings-form-parts";
import { FixedEntryRow } from "./fixed-entry-row";
import { NewFixedEntryRow } from "./new-fixed-entry-row";

export type FixedEntryRowData = {
  id: string;
  label: string;
  type: "charge" | "scheduledSaving";
  /** "d'octobre 2026": what follows "Archivé à partir"; null when the entry is active. */
  archivedFromLabel: string | null;
  amountEuros: number | null;
  /** A version that starts in a later month. */
  upcoming: { valueLabel: string; fromLabel: string } | null;
};

export function FixedEntryTable({
  rows,
  monthlyTotal,
}: {
  rows: FixedEntryRowData[];
  monthlyTotal: number;
}) {
  const [adding, setAdding] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const archivedCount = rows.filter((row) => row.archivedFromLabel).length;
  const visibleRows = rows.filter((row) => showArchived || !row.archivedFromLabel);

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <CardTable>
        <CardTableHeader>
          <TableRow>
            <TableHead>Libellé</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Montant mensuel</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </CardTableHeader>
        <CardTableBody>
          {visibleRows.map((row) => (
            <FixedEntryRow key={row.id} entry={row} />
          ))}
          {adding ? <NewFixedEntryRow onDone={() => setAdding(false)} /> : null}
          {rows.length === 0 && !adding ? (
            <TableRow className="max-md:block">
              <TableCell
                colSpan={4}
                className="whitespace-normal text-muted-foreground max-md:block"
              >
                Aucun poste fixe pour l'instant. Les postes fixes sont ce qui revient chaque mois
                (loyer, abonnements, assurance, épargne programmée) : ajoute le premier avec le
                bouton ci-dessous.
              </TableCell>
            </TableRow>
          ) : null}
        </CardTableBody>
      </CardTable>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="max-md:h-11"
            onClick={() => setAdding(true)}
            disabled={adding}
          >
            Ajouter un poste fixe
          </Button>
          <ArchivedToggle
            count={archivedCount}
            shown={showArchived}
            onToggle={() => setShowArchived((shown) => !shown)}
          />
        </div>
        <span className="text-muted-foreground text-sm">
          Total mensuel{" "}
          <strong className="font-heading text-foreground">{formatEuros(monthlyTotal)}</strong>
        </span>
      </div>
    </div>
  );
}
