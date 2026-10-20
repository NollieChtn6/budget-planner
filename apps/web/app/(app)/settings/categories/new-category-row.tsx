"use client";

import { useEffect } from "react";
import { createCategoryAction } from "@/actions/category";
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
import { NO_DEFAULT_ENVELOPE } from "@/schemas/category";
import { FormActions, FormField, SETTINGS_FORM_CLASS } from "../settings-form-parts";
import type { EnvelopeOption } from "./category-table";

export function NewCategoryRow({
  envelopeOptions,
  onDone,
}: {
  envelopeOptions: EnvelopeOption[];
  onDone: () => void;
}) {
  const [state, action, pending] = useFeedbackActionState(
    createCategoryAction,
    initialVariableEnvelopeActionState,
  );

  useEffect(() => {
    if (state.status === "success") onDone();
  }, [state.status, onDone]);

  return (
    <EditableRow isEditing onClose={onDone} title="Nouvelle catégorie" read={null} colSpan={3}>
      <form action={action} className={SETTINGS_FORM_CLASS}>
        <FormField label="Couleur">
          {(id) => (
            <Input
              id={id}
              name="color"
              type="color"
              defaultValue="#4F46E5"
              required
              className="h-8 w-14 p-1"
            />
          )}
        </FormField>
        <FormField label="Libellé">
          {(id) => (
            <Input id={id} name="label" placeholder="Courses" required className="w-full md:w-40" />
          )}
        </FormField>
        <FormField label="Enveloppe par défaut">
          {(id) => (
            <Select name="defaultEnvelopeId" defaultValue={NO_DEFAULT_ENVELOPE}>
              <SelectTrigger id={id} className="w-full md:w-48">
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
          )}
        </FormField>
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
