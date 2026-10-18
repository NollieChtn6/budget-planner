"use client";

import { useActionState, useEffect } from "react";
import { createCategoryAction } from "@/actions/category";
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
import type { EnvelopeOption } from "./category-table";

export function NewCategoryRow({
  envelopeOptions,
  onDone,
}: {
  envelopeOptions: EnvelopeOption[];
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(
    createCategoryAction,
    initialVariableEnvelopeActionState,
  );

  useEffect(() => {
    if (state.status === "success") onDone();
  }, [state.status, onDone]);

  return (
    <TableRow onKeyDown={(e) => e.key === "Escape" && onDone()}>
      <TableCell colSpan={3} className="whitespace-normal">
        <form action={action} className="flex flex-wrap items-end gap-3 py-1">
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">Couleur</span>
            <Input
              name="color"
              type="color"
              defaultValue="#4F46E5"
              required
              className="h-8 w-14 p-1"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">Libellé</span>
            <Input name="label" placeholder="Courses" required autoFocus className="w-40" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">Enveloppe par défaut</span>
            <Select name="defaultEnvelopeId" defaultValue={NO_DEFAULT_ENVELOPE}>
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
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Création..." : "Ajouter"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onDone}>
              Annuler
            </Button>
          </div>
          {state.status === "error" ? (
            <FieldError className="basis-full">{state.message}</FieldError>
          ) : null}
        </form>
      </TableCell>
    </TableRow>
  );
}
