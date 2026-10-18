"use client";

import { useActionState, useEffect, useState } from "react";
import {
  archiveCategoryAction,
  unarchiveCategoryAction,
  updateCategoryAction,
} from "@/actions/category";
import { initialVariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { NO_DEFAULT_ENVELOPE } from "@/schemas/category";
import type { CategoryRowData, EnvelopeOption } from "./category-table";

export function CategoryRow({
  category,
  envelopeOptions,
}: {
  category: CategoryRowData;
  envelopeOptions: EnvelopeOption[];
}) {
  const [editing, setEditing] = useState(false);

  const [updateState, updateAction, updatePending] = useActionState(
    updateCategoryAction,
    initialVariableEnvelopeActionState,
  );
  const [archiveState, archiveAction, archivePending] = useActionState(
    archiveCategoryAction,
    initialVariableEnvelopeActionState,
  );
  const [unarchiveState, unarchiveAction, unarchivePending] = useActionState(
    unarchiveCategoryAction,
    initialVariableEnvelopeActionState,
  );

  useEffect(() => {
    if (updateState.status === "success") setEditing(false);
  }, [updateState.status]);

  function cancel() {
    setEditing(false);
  }

  if (editing) {
    return (
      <TableRow onKeyDown={(e) => e.key === "Escape" && cancel()}>
        <TableCell colSpan={3} className="whitespace-normal">
          <form action={updateAction} className="flex flex-wrap items-end gap-3 py-1">
            <input type="hidden" name="categoryId" value={category.id} />
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs">Couleur</span>
              <Input
                name="color"
                type="color"
                defaultValue={category.color}
                required
                className="h-8 w-14 p-1"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs">Libellé</span>
              <Input
                name="label"
                defaultValue={category.label}
                required
                autoFocus
                className="w-40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs">Enveloppe par défaut</span>
              <Select
                name="defaultEnvelopeId"
                defaultValue={category.defaultEnvelopeId ?? NO_DEFAULT_ENVELOPE}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_DEFAULT_ENVELOPE}>
                    Aucune, au choix à chaque saisie
                  </SelectItem>
                  {envelopeOptions.map((envelope) => (
                    <SelectItem key={envelope.id} value={envelope.id}>
                      {envelope.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={updatePending}>
                {updatePending ? "Enregistrement..." : "Valider"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={cancel}>
                Annuler
              </Button>
            </div>
            {updateState.status === "error" ? (
              <FieldError className="basis-full">{updateState.message}</FieldError>
            ) : null}
          </form>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell className="whitespace-normal font-medium">
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          {category.label}
        </span>
        {category.archived ? (
          <div className="font-normal text-muted-foreground text-xs">Archivée</div>
        ) : null}
      </TableCell>
      <TableCell className="whitespace-normal">
        {category.defaultEnvelopeLabel ?? (
          <span className="text-muted-foreground">Au choix à chaque saisie</span>
        )}
      </TableCell>
      <TableCell className="whitespace-normal text-right">
        {category.archived ? (
          <form action={unarchiveAction} className="inline">
            <input type="hidden" name="categoryId" value={category.id} />
            <Button type="submit" variant="link" size="sm" disabled={unarchivePending}>
              Réactiver
            </Button>
          </form>
        ) : (
          <>
            <Button type="button" variant="link" size="sm" onClick={() => setEditing(true)}>
              Modifier
            </Button>
            <form action={archiveAction} className="inline">
              <input type="hidden" name="categoryId" value={category.id} />
              <Button type="submit" variant="link" size="sm" disabled={archivePending}>
                Archiver
              </Button>
            </form>
          </>
        )}
        {unarchiveState.status === "error" ? (
          <FieldError>{unarchiveState.message}</FieldError>
        ) : null}
        {archiveState.status === "error" ? <FieldError>{archiveState.message}</FieldError> : null}
      </TableCell>
    </TableRow>
  );
}
