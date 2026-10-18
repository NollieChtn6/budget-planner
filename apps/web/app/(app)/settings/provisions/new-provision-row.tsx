"use client";

import { useActionState, useEffect } from "react";
import { createProvisionAction } from "@/actions/provision";
import { initialVariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";

export function NewProvisionRow({
  type,
  onDone,
}: {
  type: "deadline" | "reserve";
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(
    createProvisionAction,
    initialVariableEnvelopeActionState,
  );

  useEffect(() => {
    if (state.status === "success") onDone();
  }, [state.status, onDone]);

  return (
    <TableRow onKeyDown={(e) => e.key === "Escape" && onDone()}>
      <TableCell colSpan={6} className="whitespace-normal">
        <form action={action} className="flex flex-wrap items-end gap-3 py-1">
          <input type="hidden" name="type" value={type} />
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">Libellé</span>
            <Input
              name="label"
              placeholder={type === "deadline" ? "Vacances" : "Imprévus"}
              required
              autoFocus
              className="w-40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">
              {type === "deadline" ? "Objectif (€)" : "Plafond (€)"}
            </span>
            <Input
              name="targetEuros"
              type="number"
              step="0.01"
              min="0.01"
              required
              className="w-28"
            />
          </div>
          {type === "deadline" ? (
            <>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Premier mois</span>
                <Input name="startMonth" type="month" required className="w-36" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Durée (mois)</span>
                <Input
                  name="durationMonths"
                  type="number"
                  step="1"
                  min="1"
                  required
                  className="w-20"
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs">Mensualité (€)</span>
              <Input
                name="monthlyAmountEuros"
                type="number"
                step="0.01"
                min="0.01"
                required
                className="w-28"
              />
            </div>
          )}
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
