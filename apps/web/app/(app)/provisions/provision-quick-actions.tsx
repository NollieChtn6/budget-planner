"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddContributionForm } from "../_components/add-contribution-form";
import { AddExpenseForm } from "../_components/add-expense-form";

export function ProvisionQuickActions({
  provisionId,
  provisionLabel,
  minDate,
  maxDate,
  defaultDate,
  categories,
  knownPlaces,
  lastUsedCategoryId,
}: {
  provisionId: string;
  provisionLabel: string;
  minDate: string;
  maxDate: string;
  defaultDate: string;
  categories: { id: string; label: string }[];
  knownPlaces: string[];
  lastUsedCategoryId: string | null;
}) {
  const [open, setOpen] = useState<"contribution" | "expense" | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="accent"
          size="sm"
          onClick={() => setOpen(open === "contribution" ? null : "contribution")}
        >
          Verser
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(open === "expense" ? null : "expense")}
        >
          Dépenser
        </Button>
      </div>
      {open === "contribution" ? (
        <Card>
          <CardHeader>
            <CardTitle>Nouveau versement</CardTitle>
          </CardHeader>
          <CardContent>
            <AddContributionForm
              provisions={[{ id: provisionId, label: provisionLabel }]}
              minDate={minDate}
              maxDate={maxDate}
              defaultDate={defaultDate}
            />
          </CardContent>
        </Card>
      ) : null}
      {open === "expense" ? (
        <Card>
          <CardHeader>
            <CardTitle>Nouvelle dépense</CardTitle>
          </CardHeader>
          <CardContent>
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
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
