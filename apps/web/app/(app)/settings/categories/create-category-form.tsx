"use client";

import type { VariableEnvelope } from "@budget/domain";
import { useActionState } from "react";
import { createCategoryAction } from "@/actions/category";
import { initialVariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NO_DEFAULT_ENVELOPE } from "@/schemas/category";

export function CreateCategoryForm({ envelopes }: { envelopes: VariableEnvelope[] }) {
  const [state, formAction, pending] = useActionState(
    createCategoryAction,
    initialVariableEnvelopeActionState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouvelle catégorie</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="label">Libellé</FieldLabel>
              <Input id="label" name="label" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="defaultEnvelopeId">Enveloppe par défaut</FieldLabel>
              <Select name="defaultEnvelopeId" defaultValue={NO_DEFAULT_ENVELOPE}>
                <SelectTrigger id="defaultEnvelopeId">
                  <SelectValue placeholder="Enveloppe par défaut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_DEFAULT_ENVELOPE}>Aucune</SelectItem>
                  {envelopes.map((envelope) => (
                    <SelectItem key={envelope.id} value={envelope.id}>
                      {envelope.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {state.status === "error" ? <FieldError>{state.message}</FieldError> : null}
            {state.status === "success" ? (
              <p className="text-sm text-muted-foreground">{state.message}</p>
            ) : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Création..." : "Créer"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
