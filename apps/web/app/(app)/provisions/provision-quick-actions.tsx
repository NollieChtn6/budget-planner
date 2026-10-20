"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { defaultOperationDate } from "@/lib/default-operation-date";
import { FORM_DIALOG_CLASS } from "@/lib/touch-targets";
import { AddContributionForm } from "../_components/add-contribution-form";
import { AddExpenseForm } from "../_components/add-expense-form";

export function ProvisionQuickActions({
  provisionId,
  provisionLabel,
  minDate,
  maxDate,
  categories,
  knownPlaces,
  lastUsedCategoryId,
}: {
  provisionId: string;
  provisionLabel: string;
  minDate: string;
  maxDate: string;
  categories: { id: string; label: string }[];
  knownPlaces: string[];
  lastUsedCategoryId: string | null;
}) {
  const [contributionOpen, setContributionOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const defaultDate = defaultOperationDate(minDate, maxDate);

  return (
    <div className="grid grid-cols-2 gap-2 md:flex">
      <Dialog open={contributionOpen} onOpenChange={setContributionOpen}>
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="accent"
              className="h-11 md:h-8"
              aria-label={`Verser sur ${provisionLabel}`}
            />
          }
        >
          Verser
        </DialogTrigger>
        <DialogContent className={FORM_DIALOG_CLASS}>
          <DialogHeader>
            <DialogTitle>Nouveau versement : {provisionLabel}</DialogTitle>
          </DialogHeader>
          <AddContributionForm
            provisions={[{ id: provisionId, label: provisionLabel }]}
            minDate={minDate}
            maxDate={maxDate}
            defaultDate={defaultDate}
            onSuccess={() => setContributionOpen(false)}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className="h-11 md:h-8"
              aria-label={`Dépenser depuis ${provisionLabel}`}
            />
          }
        >
          Dépenser
        </DialogTrigger>
        <DialogContent className={FORM_DIALOG_CLASS}>
          <DialogHeader>
            <DialogTitle>Nouvelle dépense : {provisionLabel}</DialogTitle>
          </DialogHeader>
          <AddExpenseForm
            envelopes={[]}
            provisions={[{ id: provisionId, label: provisionLabel }]}
            categories={categories}
            minDate={minDate}
            maxDate={maxDate}
            defaultDate={defaultDate}
            knownPlaces={knownPlaces}
            lastUsedCategoryId={lastUsedCategoryId}
            defaultTarget={`provision:${provisionId}`}
            onSuccess={() => setExpenseOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
