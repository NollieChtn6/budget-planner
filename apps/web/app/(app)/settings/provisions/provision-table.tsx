"use client";

import { useState } from "react";
import { CardTable, CardTableBody, CardTableHeader } from "@/components/responsive-table";
import { Button } from "@/components/ui/button";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { ArchivedToggle } from "../settings-form-parts";
import { NewProvisionRow } from "./new-provision-row";
import { ProvisionRow } from "./provision-row";

export type ProvisionRowData = {
  id: string;
  label: string;
  type: "deadline" | "reserve";
  status: "active" | "late" | "closed";
  /** "d'octobre 2026": what follows "Archivée à partir"; null when the provision is not archived. */
  archivedFromLabel: string | null;
  targetEuros: number;
  durationMonths: number | null;
  /** "juin 2027". */
  dueMonthLabel: string | null;
  monthlyAmountEuros: number | null;
};

export function ProvisionTable({
  rows,
  activeMonth,
}: {
  rows: ProvisionRowData[];
  activeMonth: string;
}) {
  const [adding, setAdding] = useState<"deadline" | "reserve" | null>(null);
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
            <TableHead className="text-right">Objectif</TableHead>
            <TableHead>Durée ou mensualité</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </CardTableHeader>
        <CardTableBody>
          {visibleRows.map((row) => (
            <ProvisionRow key={row.id} provision={row} />
          ))}
          {adding ? (
            <NewProvisionRow
              type={adding}
              activeMonth={activeMonth}
              onDone={() => setAdding(null)}
            />
          ) : null}
          {rows.length === 0 && !adding ? (
            <TableRow className="max-md:block">
              <TableCell
                colSpan={6}
                className="whitespace-normal text-muted-foreground max-md:block"
              >
                Aucune provision pour l'instant. Une provision à échéance met de côté chaque mois
                pour un projet daté (vacances, orthodontie) ; une réserve garde un plafond sans date
                (imprévus). Ajoute la première avec les boutons ci-dessous.
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
          onClick={() => setAdding("deadline")}
          disabled={adding !== null}
        >
          Ajouter une provision à échéance
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="max-md:h-11"
          onClick={() => setAdding("reserve")}
          disabled={adding !== null}
        >
          Ajouter une réserve
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
