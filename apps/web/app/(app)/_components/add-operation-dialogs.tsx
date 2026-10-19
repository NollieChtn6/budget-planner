"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Kbd } from "@/components/ui/kbd";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ExpenseLinkOption } from "@/lib/expense-link-options";
import { AddContributionForm } from "./add-contribution-form";
import { AddExpenseForm } from "./add-expense-form";
import { AddExtraIncomeForm } from "./add-extra-income-form";
import { AddReimbursementForm } from "./add-reimbursement-form";
import { AddSavingsTransferForm } from "./add-savings-transfer-form";

type OperationType = "extra-income" | "savings-transfer" | "converted-urge" | "reimbursement";

const OPERATION_TYPES: { value: OperationType; label: string; description: string }[] = [
  {
    value: "extra-income",
    label: "Entrée exceptionnelle",
    description: "Ajoutez une rentrée d'argent exceptionnelle.",
  },
  {
    value: "savings-transfer",
    label: "Transfert vers l'épargne",
    description: "Mettez de côté une somme du reste à vivre du mois.",
  },
  {
    value: "converted-urge",
    label: "Envie convertie",
    description: "Renoncez à un achat et mettez la même somme de côté.",
  },
  {
    value: "reimbursement",
    label: "Remboursement",
    description: "Enregistrez une somme reçue en retour d'une dépense déjà payée.",
  },
];

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
  const [operationOpen, setOperationOpen] = useState(false);
  const [operationType, setOperationType] = useState<OperationType>("extra-income");
  // Set when the transfer dialog is opened from a just-saved extra income, to pre-fill its amount (R36, R37).
  const [transferDefaultAmount, setTransferDefaultAmount] = useState<number | undefined>();

  const availableOperations = OPERATION_TYPES.filter(
    ({ value }) =>
      (value === "extra-income" && canAddExtraIncome) ||
      ((value === "savings-transfer" || value === "converted-urge") && canAddSavingsTransfer) ||
      (value === "reimbursement" && canAddReimbursement),
  );
  const canAddOperation = availableOperations.length > 0;
  const selectedOperation = OPERATION_TYPES.find(({ value }) => value === operationType);

  useEffect(() => {
    function openExpense() {
      if (canAddExpense) setExpenseOpen(true);
    }
    function openContribution() {
      if (canAddContribution) setContributionOpen(true);
    }
    function openOperation(type: OperationType, allowed: boolean) {
      if (!allowed) return;
      setTransferDefaultAmount(undefined);
      setOperationType(type);
      setOperationOpen(true);
    }
    function openOperationDialog() {
      if (!canAddOperation) return;
      setTransferDefaultAmount(undefined);
      setOperationOpen(true);
    }
    const openReimbursement = () => openOperation("reimbursement", canAddReimbursement);
    const openExtraIncome = () => openOperation("extra-income", canAddExtraIncome);
    const openSavingsTransfer = () => openOperation("savings-transfer", canAddSavingsTransfer);
    window.addEventListener("pecule:open-add-operation", openOperationDialog);
    window.addEventListener("pecule:open-add-extra-income", openExtraIncome);
    window.addEventListener("pecule:open-add-savings-transfer", openSavingsTransfer);
    window.addEventListener("pecule:open-add-expense", openExpense);
    window.addEventListener("pecule:open-add-reimbursement", openReimbursement);
    window.addEventListener("pecule:open-add-contribution", openContribution);
    return () => {
      window.removeEventListener("pecule:open-add-operation", openOperationDialog);
      window.removeEventListener("pecule:open-add-extra-income", openExtraIncome);
      window.removeEventListener("pecule:open-add-savings-transfer", openSavingsTransfer);
      window.removeEventListener("pecule:open-add-expense", openExpense);
      window.removeEventListener("pecule:open-add-reimbursement", openReimbursement);
      window.removeEventListener("pecule:open-add-contribution", openContribution);
    };
  }, [
    canAddOperation,
    canAddExpense,
    canAddContribution,
    canAddReimbursement,
    canAddExtraIncome,
    canAddSavingsTransfer,
  ]);

  return (
    <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:flex-wrap">
      {canAddContribution ? (
        <Dialog open={contributionOpen} onOpenChange={setContributionOpen}>
          <DialogTrigger render={<Button type="button" variant="accent" className="h-11 md:h-8" />}>
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
      {canAddExpense ? (
        <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
          <DialogTrigger
            render={
              <Button
                type="button"
                className="order-first col-span-2 h-11 md:order-none md:col-span-1 md:h-8"
              />
            }
          >
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
      {canAddOperation ? (
        <Dialog open={operationOpen} onOpenChange={setOperationOpen}>
          <DialogTrigger
            render={<Button type="button" variant="outline" className="h-11 md:h-8" />}
          >
            Nouvelle opération
            <Kbd>O</Kbd>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nouvelle opération</DialogTitle>
              <DialogDescription>{selectedOperation?.description}</DialogDescription>
            </DialogHeader>
            <Field>
              <FieldLabel htmlFor="operation-type">Type d'opération</FieldLabel>
              <Select
                value={operationType}
                onValueChange={(value) => {
                  if (value) {
                    setTransferDefaultAmount(undefined);
                    setOperationType(value as OperationType);
                  }
                }}
              >
                <SelectTrigger id="operation-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableOperations.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {operationType === "extra-income" ? (
              <AddExtraIncomeForm
                minDate={minDate}
                maxDate={maxDate}
                defaultDate={defaultDate}
                onTransfer={(amountEuros) => {
                  setTransferDefaultAmount(amountEuros);
                  setOperationType("savings-transfer");
                }}
                onClose={() => setOperationOpen(false)}
              />
            ) : null}
            {operationType === "savings-transfer" ? (
              <AddSavingsTransferForm
                key={transferDefaultAmount ?? "blank"}
                minDate={minDate}
                maxDate={maxDate}
                defaultDate={defaultDate}
                defaultAmountEuros={transferDefaultAmount}
                onClose={() => setOperationOpen(false)}
              />
            ) : null}
            {operationType === "converted-urge" ? (
              <AddSavingsTransferForm
                kind="convertedUrge"
                minDate={minDate}
                maxDate={maxDate}
                defaultDate={defaultDate}
                onClose={() => setOperationOpen(false)}
              />
            ) : null}
            {operationType === "reimbursement" ? (
              <AddReimbursementForm
                categories={categories}
                expenseOptions={expenseOptions}
                lastUsedCategoryId={lastUsedCategoryId}
                minDate={minDate}
                maxDate={maxDate}
                defaultDate={defaultDate}
                onSuccess={() => setOperationOpen(false)}
              />
            ) : null}
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
