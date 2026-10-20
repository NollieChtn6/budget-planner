"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * A form that takes two steps: a first press asks, a second one submits. Focus moves to the safe
 * answer when asked, and back to the trigger when the user declines.
 */
export function ConfirmForm({
  action,
  fields,
  pending,
  trigger,
  question,
  confirm,
  pendingLabel,
  decline = "Garder",
  destructive = true,
  block = false,
  visibleQuestion = false,
  onConfirmingChange,
}: {
  action: (formData: FormData) => void;
  /** Hidden inputs sent with the form. */
  fields: Record<string, string>;
  pending: boolean;
  trigger: ReactNode;
  /** Shown while asking; read by screen readers only in the compact layout. */
  question: string;
  confirm: string;
  pendingLabel: string;
  decline?: string;
  /** Red confirm button, for actions that cannot be taken back. */
  destructive?: boolean;
  /** Full-width layout, for the edit sheet. */
  block?: boolean;
  /** Show the question beside the buttons, not only to screen readers: it carries a consequence. */
  visibleQuestion?: boolean;
  onConfirmingChange?: (confirming: boolean) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const declineRef = useRef<HTMLButtonElement>(null);
  const hasAsked = useRef(false);

  useEffect(() => {
    if (confirming) {
      hasAsked.current = true;
      declineRef.current?.focus();
    } else if (hasAsked.current) {
      triggerRef.current?.focus();
    }
  }, [confirming]);

  function setAsking(next: boolean) {
    setConfirming(next);
    onConfirmingChange?.(next);
  }

  return (
    <form
      action={action}
      className={
        block
          ? "flex flex-col gap-2"
          : visibleQuestion
            ? "flex flex-wrap items-center gap-2"
            : "flex items-center gap-1"
      }
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {confirming ? (
        <>
          <span className={block || visibleQuestion ? "basis-full text-sm" : "sr-only"}>
            {question}
          </span>
          <div className={block ? "grid grid-cols-2 gap-2" : "flex gap-1"}>
            <Button
              type="submit"
              variant={destructive ? "destructive" : "default"}
              size={block ? "default" : "sm"}
              disabled={pending}
            >
              {pending ? pendingLabel : confirm}
            </Button>
            <Button
              ref={declineRef}
              type="button"
              variant={block ? "outline" : "ghost"}
              size={block ? "default" : "sm"}
              onClick={() => setAsking(false)}
            >
              {decline}
            </Button>
          </div>
        </>
      ) : (
        <Button
          ref={triggerRef}
          type="button"
          variant={block ? "outline" : "ghost"}
          size={block ? "default" : "sm"}
          className={
            block
              ? `w-full ${destructive ? "text-destructive" : ""}`
              : destructive
                ? "hover:text-destructive"
                : ""
          }
          onClick={() => setAsking(true)}
        >
          {trigger}
        </Button>
      )}
    </form>
  );
}
