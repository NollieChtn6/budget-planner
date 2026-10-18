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
import { EnvelopeRow } from "./envelope-row";
import { NewEnvelopeRow } from "./new-envelope-row";

export type EnvelopeRowData = {
  id: string;
  label: string;
  archivedFrom: string | null;
  mode: "amount" | "percentage";
  valueLabel: string;
  amountEuros: number | null;
  percentage: number | null;
};

export function EnvelopeTable({
  rows,
  activePercentageSum,
}: {
  rows: EnvelopeRowData[];
  activePercentageSum: number;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Libellé</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead className="text-right">Valeur</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <EnvelopeRow key={row.id} envelope={row} />
            ))}
            {adding ? <NewEnvelopeRow onDone={() => setAdding(false)} /> : null}
            {rows.length === 0 && !adding ? (
              <TableRow>
                <TableCell colSpan={4} className="whitespace-normal text-muted-foreground">
                  Aucune enveloppe pour l'instant.
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
            Ajouter une enveloppe
          </Button>
          <span className="text-muted-foreground text-sm">
            Pourcentages attribués : {activePercentageSum} %, non attribué :{" "}
            {100 - activePercentageSum} %
          </span>
        </div>
      </div>
      {activePercentageSum > 100 ? (
        <p className="rounded-lg border border-l-[3px] border-l-(--alert-warning) bg-card px-3.5 py-2.5 text-sm">
          La somme des pourcentages dépasse 100 %.
        </p>
      ) : null}
    </div>
  );
}
