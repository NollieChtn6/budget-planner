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
import { NewProvisionRow } from "./new-provision-row";
import { ProvisionRow } from "./provision-row";

export type ProvisionRowData = {
  id: string;
  label: string;
  type: "deadline" | "reserve";
  status: "active" | "late" | "closed";
  archivedFrom: string | null;
  targetEuros: number;
  durationMonths: number | null;
  dueMonthLabel: string | null;
  monthlyAmountEuros: number | null;
};

export function ProvisionTable({ rows }: { rows: ProvisionRowData[] }) {
  const [adding, setAdding] = useState<"deadline" | "reserve" | null>(null);

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Libellé</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Objectif</TableHead>
            <TableHead>Durée ou mensualité</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <ProvisionRow key={row.id} provision={row} />
          ))}
          {adding ? <NewProvisionRow type={adding} onDone={() => setAdding(null)} /> : null}
          {rows.length === 0 && !adding ? (
            <TableRow>
              <TableCell colSpan={6} className="whitespace-normal text-muted-foreground">
                Aucune provision pour l'instant.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
      <div className="flex flex-wrap items-center gap-2 border-t px-4 py-2.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAdding("deadline")}
          disabled={adding !== null}
        >
          Ajouter une provision à échéance
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAdding("reserve")}
          disabled={adding !== null}
        >
          Ajouter une réserve
        </Button>
      </div>
    </div>
  );
}
