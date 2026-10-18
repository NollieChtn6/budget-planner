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

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Catégorie</TableHead>
            <TableHead>Enveloppe par défaut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <CategoryRow key={row.id} category={row} envelopeOptions={envelopeOptions} />
          ))}
          {adding ? (
            <NewCategoryRow envelopeOptions={envelopeOptions} onDone={() => setAdding(false)} />
          ) : null}
          {rows.length === 0 && !adding ? (
            <TableRow>
              <TableCell colSpan={3} className="whitespace-normal text-muted-foreground">
                Aucune catégorie pour l'instant.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
      <div className="border-t px-4 py-2.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAdding(true)}
          disabled={adding}
        >
          Ajouter une catégorie
        </Button>
      </div>
    </div>
  );
}
