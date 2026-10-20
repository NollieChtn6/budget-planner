"use client";

import { useEffect, useState } from "react";
import { changePasswordAction } from "@/actions/profile";
import { initialProfileActionState } from "@/actions/profile-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFeedbackActionState } from "@/lib/use-feedback-action-state";

export function PasswordSection() {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useFeedbackActionState(
    changePasswordAction,
    initialProfileActionState,
  );

  useEffect(() => {
    if (state.status === "success") setEditing(false);
  }, [state.status]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mot de passe</CardTitle>
      </CardHeader>
      <CardContent>
        {editing ? (
          <form action={action}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="currentPassword">Mot de passe actuel</FieldLabel>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                  autoFocus
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="newPassword">Nouveau mot de passe</FieldLabel>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="confirmPassword">Confirmer le nouveau mot de passe</FieldLabel>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                />
              </Field>
              {state.status === "error" ? <FieldError>{state.message}</FieldError> : null}
              <div className="flex gap-2 max-md:[&>*]:flex-1">
                <Button type="submit" disabled={pending}>
                  {pending ? "Enregistrement..." : "Valider"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                  Annuler
                </Button>
              </div>
            </FieldGroup>
          </form>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground" aria-hidden>
              ••••••••
            </span>
            <Button type="button" variant="outline" onClick={() => setEditing(true)}>
              Modifier
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
