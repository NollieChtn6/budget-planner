"use client";

import { useActionState, useEffect, useState } from "react";
import { createFixedEntryAction } from "@/actions/fixed-entry";
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

export function NewFixedEntryRow({ onDone }: { onDone: () => void }) {
  const [type, setType] = useState<"charge" | "scheduledSaving">("charge");
  const [state, action, pending] = useActionState(
    createFixedEntryAction,
    initialVariableEnvelopeActionState,
  );

  useEffect(() => {
    if (state.status === "success") onDone();
  }, [state.status, onDone]);

  return (
    <TableRow onKeyDown={(e) => e.key === "Escape" && onDone()}>
      <TableCell colSpan={4} className="whitespace-normal">
        <form action={action} className="flex flex-wrap items-end gap-3 py-1">
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">Libellé</span>
            <Input name="label" placeholder="Loyer" required autoFocus className="w-36" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">Type</span>
            <Select
              name="type"
              value={type}
              onValueChange={(value) => setType(value as typeof type)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="charge">Charge</SelectItem>
                <SelectItem value="scheduledSaving">Épargne programmée</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">Montant (€)</span>
            <Input name="amountEuros" type="number" step="0.01" min="0" required className="w-28" />
          </div>
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
