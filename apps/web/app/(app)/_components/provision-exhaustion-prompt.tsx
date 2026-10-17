"use client";

import { useActionState, useEffect } from "react";
import { closeProvisionAction, renewProvisionAction } from "@/actions/provision";
import { initialVariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field";

/** R23: shown right after an expense empties a deadline provision. */
export function ProvisionExhaustionPrompt({
  provisionId,
  label,
  onResolved,
}: {
  provisionId: string;
  label: string;
  onResolved: () => void;
}) {
  const [closeState, closeAction, closePending] = useActionState(
    closeProvisionAction,
    initialVariableEnvelopeActionState,
  );
  const [renewState, renewAction, renewPending] = useActionState(
    renewProvisionAction,
    initialVariableEnvelopeActionState,
  );

  useEffect(() => {
    if (closeState.status === "success" || renewState.status === "success") {
      onResolved();
    }
  }, [closeState.status, renewState.status, onResolved]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>« {label} » est vide</CardTitle>
        <CardDescription>Cette dépense a vidé la provision. Que veux-tu en faire ?</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <form action={closeAction} className="flex flex-col gap-1">
          <input type="hidden" name="provisionId" value={provisionId} />
          {closeState.status === "error" ? <FieldError>{closeState.message}</FieldError> : null}
          <Button type="submit" variant="outline" disabled={closePending}>
            {closePending ? "Clôture..." : "Clôturer"}
          </Button>
        </form>
        <form action={renewAction} className="flex flex-col gap-1">
          <input type="hidden" name="provisionId" value={provisionId} />
          {renewState.status === "error" ? <FieldError>{renewState.message}</FieldError> : null}
          <Button type="submit" variant="outline" disabled={renewPending}>
            {renewPending ? "Renouvellement..." : "Renouveler"}
          </Button>
        </form>
        <Button type="button" variant="ghost" onClick={onResolved}>
          Conserver
        </Button>
      </CardContent>
    </Card>
  );
}
