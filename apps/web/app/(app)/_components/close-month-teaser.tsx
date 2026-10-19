"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CloseMonthForm } from "./close-month-form";

/** The dash grid's closecard (docs/ui/pecule_maquettes_v_02.html, .closecard): clôture is opt-in, behind a dialog, not an always-open form. */
export function CloseMonthTeaser({
  monthLabel,
  envelopeRemainders,
  leftover,
  allocatable,
  previousAllocations,
  provisions,
  nextMonthEnvelopes,
  nextMonthIsOpen,
}: {
  monthLabel: string;
  envelopeRemainders: { label: string; remaining: number }[];
  leftover: number;
  allocatable: number;
  previousAllocations: { label: string; amount: number }[];
  provisions: { id: string; label: string }[];
  nextMonthEnvelopes: { id: string; label: string }[];
  nextMonthIsOpen: boolean;
}) {
  return (
    <Card
      id="cloture"
      className="col-span-12 flex flex-row flex-wrap items-center justify-between gap-3 p-4"
    >
      <div>
        <p className="font-medium">Fin du mois ?</p>
        <p className="text-sm text-muted-foreground">
          Répartis le reliquat de tes enveloppes et verrouille {monthLabel}.
        </p>
      </div>
      <Dialog>
        <DialogTrigger render={<Button type="button" variant="outline" />}>
          Clôturer {monthLabel}
        </DialogTrigger>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Clôturer {monthLabel}</DialogTitle>
            <DialogDescription>
              Une fois clôturé, le mois ne sera plus modifiable, sauf réouverture.
            </DialogDescription>
          </DialogHeader>
          <CloseMonthForm
            envelopeRemainders={envelopeRemainders}
            leftover={leftover}
            allocatable={allocatable}
            previousAllocations={previousAllocations}
            provisions={provisions}
            nextMonthEnvelopes={nextMonthEnvelopes}
            nextMonthIsOpen={nextMonthIsOpen}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
