"use client";

import { useActionState, useEffect, useState } from "react";
import { createVariableEnvelopeAction } from "@/actions/variable-envelope";
import { initialVariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { EditableRow } from "@/components/editable-row";
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
import {
  FormActions,
  FormField,
  MonthChoiceSelect,
  SETTINGS_FORM_CLASS,
} from "../settings-form-parts";

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
    <EditableRow isEditing onClose={onDone} title="Nouvelle enveloppe" read={null} colSpan={4}>
      <form action={action} className={SETTINGS_FORM_CLASS}>
        <input type="hidden" name="mode" value={mode} />
        <FormField label="Libellé">
          {(id) => (
            <Input
              id={id}
              name="label"
              placeholder="Sorties et loisirs"
              required
              className="w-full md:w-44"
            />
          )}
        </FormField>
        <FormField label="Mode">
          {(id) => (
            <Select value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
              <SelectTrigger id={id} className="w-full md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="amount">Montant fixe</SelectItem>
                <SelectItem value="percentage">Pourcentage</SelectItem>
              </SelectContent>
            </Select>
          )}
        </FormField>
        {mode === "amount" ? (
          <FormField label="Montant (€)">
            {(id) => (
              <Input
                id={id}
                name="amountEuros"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                required
                className="w-full md:w-28"
              />
            )}
          </FormField>
        ) : (
          <FormField label="Pourcentage (%)">
            {(id) => (
              <Input
                id={id}
                name="percentage"
                type="number"
                inputMode="numeric"
                step="1"
                min="0"
                max="100"
                required
                className="w-full md:w-24"
              />
            )}
          </FormField>
        )}
        <MonthChoiceSelect label="À partir de" />
        <FormActions>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Création..." : "Ajouter"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>
            Annuler
          </Button>
        </FormActions>
        {state.status === "error" ? (
          <FieldError className="basis-full">{state.message}</FieldError>
        ) : null}
      </form>
    </EditableRow>
  );
}
