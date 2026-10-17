"use client";

import { useActionState } from "react";
import { createAccountAction } from "@/actions/setup";
import { initialSetupActionState } from "@/actions/setup-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function SetupForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(createAccountAction, initialSetupActionState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Créer le compte</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          <FieldGroup>
            <input type="hidden" name="token" value={token} />
            <Field>
              <FieldLabel htmlFor="name">Prénom</FieldLabel>
              <Input id="name" name="name" autoComplete="name" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </Field>
            {state.status === "error" ? <FieldError>{state.message}</FieldError> : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Création..." : "Créer le compte"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
