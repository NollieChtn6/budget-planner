"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import type { ExpenseLinkOption } from "@/lib/expense-link-options";
import { AddContributionForm } from "./add-contribution-form";
import { AddExpenseForm } from "./add-expense-form";
import { AddReimbursementForm } from "./add-reimbursement-form";

/** Header actions for "Ce mois-ci" (docs/ui/pecule_maquettes_v_02.html, headActions): dialogs opened either by click or by the N/V shortcuts from keyboard-shortcuts.tsx. */
export function AddOperationDialogs({
  canAddExpense,
  canAddContribution,
  canAddReimbursement,
  expenseOptions,
  envelopes,
  provisions,
  categories,
  minDate,
  maxDate,
  defaultDate,
  knownPlaces,
  lastUsedCategoryId,
}: {
  canAddExpense: boolean;
  canAddContribution: boolean;
  canAddReimbursement: boolean;
  expenseOptions: ExpenseLinkOption[];
  envelopes: { id: string; label: string }[];
  provisions: { id: string; label: string }[];
  categories: { id: string; label: string }[];
  minDate: string;
  maxDate: string;
  defaultDate: string;
  knownPlaces: string[];
  lastUsedCategoryId: string | null;
}) {
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [contributionOpen, setContributionOpen] = useState(false);
  const [reimbursementOpen, setReimbursementOpen] = useState(false);

  useEffect(() => {
    function openExpense() {
      if (canAddExpense) setExpenseOpen(true);
    }
    function openContribution() {
      if (canAddContribution) setContributionOpen(true);
    }
    function openReimbursement() {
      if (canAddReimbursement) setReimbursementOpen(true);
    }
    window.addEventListener("pecule:open-add-expense", openExpense);
    window.addEventListener("pecule:open-add-reimbursement", openReimbursement);
    window.addEventListener("pecule:open-add-contribution", openContribution);
    return () => {
      window.removeEventListener("pecule:open-add-expense", openExpense);
      window.removeEventListener("pecule:open-add-reimbursement", openReimbursement);
      window.removeEventListener("pecule:open-add-contribution", openContribution);
    };
  }, [canAddExpense, canAddContribution, canAddReimbursement]);

  return (
    <div className="flex gap-2">
      {canAddContribution ? (
        <Dialog open={contributionOpen} onOpenChange={setContributionOpen}>
          <DialogTrigger render={<Button type="button" variant="accent" />}>
            Nouveau versement
            <Kbd className="border-accent-foreground/40 bg-transparent text-accent-foreground/70">
              V
            </Kbd>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nouveau versement</DialogTitle>
            </DialogHeader>
            <AddContributionForm
              provisions={provisions}
              minDate={minDate}
              maxDate={maxDate}
              defaultDate={defaultDate}
              onSuccess={() => setContributionOpen(false)}
            />
          </DialogContent>
        </Dialog>
      ) : null}
      {canAddReimbursement ? (
        <Dialog open={reimbursementOpen} onOpenChange={setReimbursementOpen}>
          <DialogTrigger render={<Button type="button" variant="outline" />}>
            Nouveau remboursement
            <Kbd>R</Kbd>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nouveau remboursement</DialogTitle>
            </DialogHeader>
            <AddReimbursementForm
              categories={categories}
              expenseOptions={expenseOptions}
              lastUsedCategoryId={lastUsedCategoryId}
              minDate={minDate}
              maxDate={maxDate}
              defaultDate={defaultDate}
              onSuccess={() => setReimbursementOpen(false)}
            />
          </DialogContent>
        </Dialog>
      ) : null}
      {canAddExpense ? (
        <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
          <DialogTrigger render={<Button type="button" />}>
            Nouvelle dépense
            <Kbd className="border-primary-foreground/40 bg-transparent text-primary-foreground/70">
              N
            </Kbd>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nouvelle dépense</DialogTitle>
            </DialogHeader>
            <AddExpenseForm
              envelopes={envelopes}
              provisions={provisions}
              categories={categories}
              minDate={minDate}
              maxDate={maxDate}
              defaultDate={defaultDate}
              knownPlaces={knownPlaces}
              lastUsedCategoryId={lastUsedCategoryId}
              onSuccess={() => setExpenseOpen(false)}
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
