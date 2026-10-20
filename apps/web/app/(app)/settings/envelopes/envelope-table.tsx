"use client";

import { useState } from "react";
import { CardTable, CardTableBody, CardTableHeader } from "@/components/responsive-table";
import { Button } from "@/components/ui/button";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { ArchivedToggle } from "../settings-form-parts";
import { EnvelopeRow } from "./envelope-row";
import { NewEnvelopeRow } from "./new-envelope-row";

export type EnvelopeRowData = {
  id: string;
  label: string;
  /** "d'octobre 2026": what follows "Archivée à partir"; null when the envelope is active. */
  archivedFromLabel: string | null;
  mode: "amount" | "percentage";
  valueLabel: string;
  amountEuros: number | null;
  percentage: number | null;
  /** A version that starts in a later month. */
  upcoming: { valueLabel: string; fromLabel: string } | null;
};

export function EnvelopeTable({
  rows,
  activePercentageSum,
}: {
  rows: EnvelopeRowData[];
  activePercentageSum: number;
}) {
  const [adding, setAdding] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const archivedCount = rows.filter((row) => row.archivedFromLabel).length;
  const visibleRows = rows.filter((row) => showArchived || !row.archivedFromLabel);

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-xl border bg-card">
        <CardTable>
          <CardTableHeader>
            <TableRow>
              <TableHead>Libellé</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead className="text-right">Valeur</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </CardTableHeader>
          <CardTableBody>
            {visibleRows.map((row) => (
              <EnvelopeRow key={row.id} envelope={row} />
            ))}
            {adding ? <NewEnvelopeRow onDone={() => setAdding(false)} /> : null}
            {rows.length === 0 && !adding ? (
              <TableRow className="max-md:block">
                <TableCell
                  colSpan={4}
                  className="whitespace-normal text-muted-foreground max-md:block"
                >
                  Aucune enveloppe pour l'instant. Une enveloppe est un budget mensuel que tes
                  dépenses consomment (Vie quotidienne, Sorties et loisirs…) : ajoute la première
                  avec le bouton ci-dessous.
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
              Ajouter une enveloppe
            </Button>
            <ArchivedToggle
              count={archivedCount}
              shown={showArchived}
              onToggle={() => setShowArchived((shown) => !shown)}
            />
          </div>
          <span className="text-muted-foreground text-sm">
            Pourcentages attribués : {activePercentageSum} %, non attribué :{" "}
            {100 - activePercentageSum} %
          </span>
        </div>
      </div>
      {activePercentageSum > 100 ? (
        <p
          role="alert"
          className="rounded-lg border border-l-[3px] border-l-(--alert-warning) bg-card px-3.5 py-2.5 text-sm"
        >
          La somme des pourcentages dépasse 100 %.
        </p>
      ) : null}
    </div>
  );
}
