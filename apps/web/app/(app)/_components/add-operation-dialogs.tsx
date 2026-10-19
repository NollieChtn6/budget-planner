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
import { AddExtraIncomeForm } from "./add-extra-income-form";
import { AddReimbursementForm } from "./add-reimbursement-form";
import { AddSavingsTransferForm } from "./add-savings-transfer-form";

/** Header actions for "Ce mois-ci" (docs/ui/pecule_maquettes_v_02.html, headActions): dialogs opened either by click or by the N/V shortcuts from keyboard-shortcuts.tsx. */
export function AddOperationDialogs({
  canAddExpense,
  canAddContribution,
  canAddReimbursement,
  canAddExtraIncome,
  canAddSavingsTransfer,
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
  canAddExtraIncome: boolean;
  canAddSavingsTransfer: boolean;
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
  const [extraIncomeOpen, setExtraIncomeOpen] = useState(false);
  const [savingsTransferOpen, setSavingsTransferOpen] = useState(false);
  // Set when the transfer dialog is opened from a just-saved extra income, to pre-fill its amount (R36, R37).
  const [transferDefaultAmount, setTransferDefaultAmount] = useState<number | undefined>();

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
    function openExtraIncome() {
      if (canAddExtraIncome) setExtraIncomeOpen(true);
    }
    function openSavingsTransfer() {
      if (!canAddSavingsTransfer) return;
      setTransferDefaultAmount(undefined);
      setSavingsTransferOpen(true);
    }
    window.addEventListener("pecule:open-add-extra-income", openExtraIncome);
    window.addEventListener("pecule:open-add-savings-transfer", openSavingsTransfer);
    window.addEventListener("pecule:open-add-expense", openExpense);
    window.addEventListener("pecule:open-add-reimbursement", openReimbursement);
    window.addEventListener("pecule:open-add-contribution", openContribution);
    return () => {
      window.removeEventListener("pecule:open-add-extra-income", openExtraIncome);
      window.removeEventListener("pecule:open-add-savings-transfer", openSavingsTransfer);
      window.removeEventListener("pecule:open-add-expense", openExpense);
      window.removeEventListener("pecule:open-add-reimbursement", openReimbursement);
      window.removeEventListener("pecule:open-add-contribution", openContribution);
    };
  }, [
    canAddExpense,
    canAddContribution,
    canAddReimbursement,
    canAddExtraIncome,
    canAddSavingsTransfer,
  ]);

  return (
    <div className="flex flex-wrap gap-2">
      {canAddExtraIncome ? (
        <Dialog open={extraIncomeOpen} onOpenChange={setExtraIncomeOpen}>
          <DialogTrigger render={<Button type="button" variant="outline" />}>
            Nouvelle entrée
            <Kbd>E</Kbd>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nouvelle entrée exceptionnelle</DialogTitle>
            </DialogHeader>
            <AddExtraIncomeForm
              minDate={minDate}
              maxDate={maxDate}
              defaultDate={defaultDate}
              onTransfer={(amountEuros) => {
                setExtraIncomeOpen(false);
                setTransferDefaultAmount(amountEuros);
                setSavingsTransferOpen(true);
              }}
              onClose={() => setExtraIncomeOpen(false)}
            />
          </DialogContent>
        </Dialog>
      ) : null}
      {canAddSavingsTransfer ? (
        <Dialog open={savingsTransferOpen} onOpenChange={setSavingsTransferOpen}>
          <DialogTrigger
            render={
              <Button
                type="button"
                variant="outline"
                onClick={() => setTransferDefaultAmount(undefined)}
              />
            }
          >
            Transfert épargne
            <Kbd>T</Kbd>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Transfert vers l'épargne</DialogTitle>
            </DialogHeader>
            <AddSavingsTransferForm
              key={transferDefaultAmount ?? "blank"}
              minDate={minDate}
              maxDate={maxDate}
              defaultDate={defaultDate}
              defaultAmountEuros={transferDefaultAmount}
              onClose={() => setSavingsTransferOpen(false)}
            />
          </DialogContent>
        </Dialog>
      ) : null}
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
