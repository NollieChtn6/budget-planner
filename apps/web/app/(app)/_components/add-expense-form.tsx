"use client";

import { useActionState, useEffect, useState } from "react";
import { createExpenseAction } from "@/actions/expense";
import { initialExpenseActionState } from "@/actions/expense-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProvisionExhaustionPrompt } from "./provision-exhaustion-prompt";

export function AddExpenseForm({
  envelopes,
  provisions,
  categories,
  minDate,
  maxDate,
  defaultDate,
  knownPlaces,
  lastUsedCategoryId,
  defaultTarget: presetTarget,
}: {
  envelopes: { id: string; label: string }[];
  provisions: { id: string; label: string }[];
  categories: { id: string; label: string }[];
  minDate: string;
  maxDate: string;
  defaultDate: string;
  knownPlaces: string[];
  lastUsedCategoryId: string | null;
  /** Presets "Imputer à", e.g. from a provision card's "Dépenser" action. */
  defaultTarget?: string;
}) {
  const [state, formAction, pending] = useActionState(
    createExpenseAction,
    initialExpenseActionState,
  );
  const [exhaustionResolved, setExhaustionResolved] = useState(false);
  useEffect(() => {
    if (state.provisionExhausted) {
      setExhaustionResolved(false);
    }
  }, [state.provisionExhausted]);
  const defaultTarget =
    presetTarget ??
    (envelopes.length > 0 ? `envelope:${envelopes[0]?.id}` : `provision:${provisions[0]?.id}`);
  // Derived data (docs/domain/model.md): defaults to the last category actually
  // used, falling back to the first one if it's since been archived.
  const defaultCategoryId =
    (lastUsedCategoryId && categories.some((c) => c.id === lastUsedCategoryId)
      ? lastUsedCategoryId
      : categories[0]?.id) ?? undefined;

  if (state.provisionExhausted && !exhaustionResolved) {
    return (
      <ProvisionExhaustionPrompt
        provisionId={state.provisionExhausted.provisionId}
        label={state.provisionExhausted.label}
        onResolved={() => setExhaustionResolved(true)}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouvelle dépense</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="amountEuros">Montant (€)</FieldLabel>
              <Input
                id="amountEuros"
                name="amountEuros"
                type="number"
                step="0.01"
                min="0"
                required
                autoFocus
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="place">Lieu</FieldLabel>
              <Input id="place" name="place" placeholder="Monoprix" list="known-places" />
              <datalist id="known-places">
                {knownPlaces.map((place) => (
                  <option key={place} value={place} />
                ))}
              </datalist>
            </Field>
            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Input id="description" name="description" placeholder="Produits d'entretien" />
            </Field>
            <Field>
              <FieldLabel htmlFor="categoryId">Catégorie</FieldLabel>
              <Select name="categoryId" defaultValue={defaultCategoryId}>
                <SelectTrigger id="categoryId">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="target">Imputer à</FieldLabel>
              <Select name="target" defaultValue={defaultTarget}>
                <SelectTrigger id="target">
                  <SelectValue placeholder="Imputer à" />
                </SelectTrigger>
                <SelectContent>
                  {envelopes.length > 0 ? (
                    <SelectGroup>
                      <SelectLabel>Enveloppes</SelectLabel>
                      {envelopes.map((envelope) => (
                        <SelectItem key={envelope.id} value={`envelope:${envelope.id}`}>
                          {envelope.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ) : null}
                  {provisions.length > 0 ? (
                    <SelectGroup>
                      <SelectLabel>Provisions</SelectLabel>
                      {provisions.map((provision) => (
                        <SelectItem key={provision.id} value={`provision:${provision.id}`}>
                          {provision.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ) : null}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="date">Date</FieldLabel>
              <Input
                id="date"
                name="date"
                type="date"
                required
                min={minDate}
                max={maxDate}
                defaultValue={defaultDate}
              />
            </Field>
            {state.status === "error" ? <FieldError>{state.message}</FieldError> : null}
            {state.status === "success" ? (
              <p className="text-sm text-muted-foreground">{state.message}</p>
            ) : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Ajout..." : "Ajouter la dépense"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
