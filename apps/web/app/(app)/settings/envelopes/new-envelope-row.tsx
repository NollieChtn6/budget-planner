"use client";

import { useActionState, useEffect, useState } from "react";
import { createVariableEnvelopeAction } from "@/actions/variable-envelope";
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

export function NewEnvelopeRow({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<"amount" | "percentage">("amount");
  const [state, action, pending] = useActionState(
    createVariableEnvelopeAction,
    initialVariableEnvelopeActionState,
  );

  useEffect(() => {
    if (state.status === "success") onDone();
  }, [state.status, onDone]);

  return (
    <TableRow onKeyDown={(e) => e.key === "Escape" && onDone()}>
      <TableCell colSpan={4} className="whitespace-normal">
        <form action={action} className="flex flex-wrap items-end gap-3 py-1">
          <input type="hidden" name="mode" value={mode} />
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">Libellé</span>
            <Input
              name="label"
              placeholder="Sorties et loisirs"
              required
              autoFocus
              className="w-44"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">Mode</span>
            <Select value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="amount">Montant fixe</SelectItem>
                <SelectItem value="percentage">Pourcentage</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {mode === "amount" ? (
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs">Montant (€)</span>
              <Input
                name="amountEuros"
                type="number"
                step="0.01"
                min="0"
                required
                className="w-28"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs">Pourcentage (%)</span>
              <Input
                name="percentage"
                type="number"
                step="1"
                min="0"
                max="100"
                required
                className="w-24"
              />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">Date d'effet</span>
            <Select name="effectiveFrom" defaultValue="current">
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Ce mois-ci</SelectItem>
                <SelectItem value="next">Le mois prochain</SelectItem>
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
