"use client";

import { useState } from "react";
import { CardTable, CardTableBody, CardTableHeader } from "@/components/responsive-table";
import { Button } from "@/components/ui/button";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { ArchivedToggle } from "../settings-form-parts";
import { CategoryRow } from "./category-row";
import { NewCategoryRow } from "./new-category-row";

export type CategoryRowData = {
  id: string;
  label: string;
  color: string;
  archived: boolean;
  defaultEnvelopeId: string | null;
  defaultEnvelopeLabel: string | null;
};

export type EnvelopeOption = { id: string; label: string };

export function CategoryTable({
  rows,
  envelopeOptions,
}: {
  rows: CategoryRowData[];
  envelopeOptions: EnvelopeOption[];
}) {
  const [adding, setAdding] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const archivedCount = rows.filter((row) => row.archived).length;
  const visibleRows = rows.filter((row) => showArchived || !row.archived);

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <CardTable>
        <CardTableHeader>
          <TableRow>
            <TableHead>Catégorie</TableHead>
            <TableHead>Enveloppe par défaut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </CardTableHeader>
        <CardTableBody>
          {visibleRows.map((row) => (
            <CategoryRow key={row.id} category={row} envelopeOptions={envelopeOptions} />
          ))}
          {adding ? (
            <NewCategoryRow envelopeOptions={envelopeOptions} onDone={() => setAdding(false)} />
          ) : null}
          {rows.length === 0 && !adding ? (
            <TableRow className="max-md:block">
              <TableCell
                colSpan={3}
                className="whitespace-normal text-muted-foreground max-md:block"
              >
                Aucune catégorie pour l'instant. Les catégories classent tes dépenses (Alimentation,
                Santé…) : ajoute la première avec le bouton ci-dessous.
              </TableCell>
            </TableRow>
          ) : null}
        </CardTableBody>
      </CardTable>
      <div className="flex flex-wrap items-center gap-2 border-t px-4 py-2.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="max-md:h-11"
          onClick={() => setAdding(true)}
          disabled={adding}
        >
          Ajouter une catégorie
        </Button>
        <ArchivedToggle
          count={archivedCount}
          shown={showArchived}
          onToggle={() => setShowArchived((shown) => !shown)}
        />
      </div>
    </div>
  );
}
