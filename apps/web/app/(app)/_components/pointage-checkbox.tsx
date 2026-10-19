"use client";

import { useActionState, useRef } from "react";
import { pointFixedEntryAction } from "@/actions/month";
import { initialVariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/components/ui/field";
import { Label } from "@/components/ui/label";

export function PointageCheckbox({
  fixedEntryId,
  label,
  amountLabel,
  defaultChecked,
}: {
  fixedEntryId: string;
  label: string;
  amountLabel: string;
  defaultChecked: boolean;
}) {
  const [state, action, pending] = useActionState(
    pointFixedEntryAction,
    initialVariableEnvelopeActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-0.5">
      <input type="hidden" name="fixedEntryId" value={fixedEntryId} />
      <Label className="flex min-h-11 items-center justify-between gap-2 text-sm md:min-h-0">
        <span className="flex items-center gap-2">
          <Checkbox
            name="done"
            value="true"
            defaultChecked={defaultChecked}
            disabled={pending}
            onCheckedChange={() => formRef.current?.requestSubmit()}
          />
          <span className={defaultChecked ? "text-muted-foreground line-through" : ""}>
            {label}
          </span>
        </span>
        <span className="text-muted-foreground">{amountLabel}</span>
      </Label>
      {state.status === "error" ? <FieldError>{state.message}</FieldError> : null}
    </form>
  );
}
