"use client";

import type { Category, VariableEnvelope } from "@budget/domain";
import { useActionState } from "react";
import { archiveCategoryAction, unarchiveCategoryAction } from "@/actions/category";
import { initialVariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function CategoryCard({
  category,
  envelopes,
}: {
  category: Category;
  envelopes: VariableEnvelope[];
}) {
  const [archiveState, archiveAction, archivePending] = useActionState(
    archiveCategoryAction,
    initialVariableEnvelopeActionState,
  );
  const [unarchiveState, unarchiveAction, unarchivePending] = useActionState(
    unarchiveCategoryAction,
    initialVariableEnvelopeActionState,
  );

  const defaultEnvelopeLabel = envelopes.find((e) => e.id === category.defaultEnvelopeId)?.label;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{category.label}</CardTitle>
        <CardDescription>
          {defaultEnvelopeLabel
            ? `Enveloppe par défaut : ${defaultEnvelopeLabel}`
            : "Aucune enveloppe par défaut"}
        </CardDescription>
        {category.archived ? <CardDescription>Archivée</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {category.archived ? (
          <form action={unarchiveAction} className="flex flex-col gap-3">
            <Input type="hidden" name="categoryId" value={category.id} />
            {unarchiveState.status === "error" ? (
              <FieldError>{unarchiveState.message}</FieldError>
            ) : null}
            <Button type="submit" variant="outline" disabled={unarchivePending}>
              {unarchivePending ? "Désarchivage..." : "Désarchiver"}
            </Button>
          </form>
        ) : (
          <form action={archiveAction} className="flex flex-col gap-3">
            <Input type="hidden" name="categoryId" value={category.id} />
            {archiveState.status === "error" ? (
              <FieldError>{archiveState.message}</FieldError>
            ) : null}
            <Button type="submit" variant="destructive" disabled={archivePending}>
              {archivePending ? "Archivage..." : "Archiver"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
