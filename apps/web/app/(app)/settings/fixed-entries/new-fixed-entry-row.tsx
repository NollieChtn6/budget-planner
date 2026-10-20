"use client";

import { useEffect, useState } from "react";
import { createFixedEntryAction } from "@/actions/fixed-entry";
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
import { useFeedbackActionState } from "@/lib/use-feedback-action-state";
import {
  FormActions,
  FormField,
  MonthChoiceSelect,
  SETTINGS_FORM_CLASS,
} from "../settings-form-parts";

export function NewFixedEntryRow({ onDone }: { onDone: () => void }) {
  const [type, setType] = useState<"charge" | "scheduledSaving">("charge");
  const [state, action, pending] = useFeedbackActionState(
    createFixedEntryAction,
    initialVariableEnvelopeActionState,
  );

  useEffect(() => {
    if (state.status === "success") onDone();
  }, [state.status, onDone]);

  return (
    <EditableRow isEditing onClose={onDone} title="Nouveau poste fixe" read={null} colSpan={4}>
      <form action={action} className={SETTINGS_FORM_CLASS}>
        <FormField label="Libellé">
          {(id) => (
            <Input id={id} name="label" placeholder="Loyer" required className="w-full md:w-36" />
          )}
        </FormField>
        <FormField label="Type">
          {(id) => (
            <Select
              name="type"
              value={type}
              onValueChange={(value) => setType(value as typeof type)}
            >
              <SelectTrigger id={id} className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="charge">Charge</SelectItem>
                <SelectItem value="scheduledSaving">Épargne programmée</SelectItem>
              </SelectContent>
            </Select>
          )}
        </FormField>
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
