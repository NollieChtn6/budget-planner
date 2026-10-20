"use client";

import { useEffect, useState } from "react";
import { updateNameAction } from "@/actions/profile";
import { initialProfileActionState } from "@/actions/profile-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFeedbackActionState } from "@/lib/use-feedback-action-state";

export function NameSection({ name }: { name: string }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useFeedbackActionState(
    updateNameAction,
    initialProfileActionState,
  );

  useEffect(() => {
    if (state.status === "success") setEditing(false);
  }, [state.status]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prénom</CardTitle>
      </CardHeader>
      <CardContent>
        {editing ? (
          <form action={action}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Prénom</FieldLabel>
                <Input
                  id="name"
                  name="name"
                  autoComplete="given-name"
                  defaultValue={name}
                  maxLength={50}
                  required
                  autoFocus
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
            <span className="font-medium">{name}</span>
            <Button type="button" variant="outline" onClick={() => setEditing(true)}>
              Modifier
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
