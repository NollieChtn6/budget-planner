"use client";

import { cn } from "cn";
import { createContext, type ReactNode, useContext, useId } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** The two months a settings change can start from, named (server-computed, see the layout). */
const MonthChoicesContext = createContext({ current: "Ce mois-ci", next: "Le mois prochain" });

export function MonthChoicesProvider({
  current,
  next,
  children,
}: {
  current: string;
  next: string;
  children: ReactNode;
}) {
  return <MonthChoicesContext value={{ current, next }}>{children}</MonthChoicesContext>;
}

/** Layout of a settings form: stacked in the sheet, one wrapping line from `md`. */
export const SETTINGS_FORM_CLASS = "flex flex-col gap-3 py-1 md:flex-row md:flex-wrap md:items-end";

/** A labelled field; `children` receives the id to put on the control. */
export function FormField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Label htmlFor={id} className="text-muted-foreground text-xs max-md:text-sm">
        {label}
      </Label>
      {children(id)}
    </div>
  );
}

/** "À partir de": the month a change starts from, named instead of "ce mois-ci" / "le mois prochain". */
export function MonthChoiceSelect({ label }: { label: string }) {
  const { current, next } = useContext(MonthChoicesContext);
  return (
    <FormField label={label}>
      {(id) => (
        <Select name="effectiveFrom" defaultValue="current">
          <SelectTrigger id={id} className="w-full md:w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">{current} (ce mois-ci)</SelectItem>
            <SelectItem value="next">{next} (mois suivant)</SelectItem>
          </SelectContent>
        </Select>
      )}
    </FormField>
  );
}

export function FormActions({ children }: { children: ReactNode }) {
  return <div className="flex gap-2 max-md:[&>*]:flex-1">{children}</div>;
}

/** Secondary actions of an edit form, kept out of the row so it carries a single "Modifier". */
export function OtherActions({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
      <span className="text-muted-foreground text-xs max-md:text-sm">Autres actions</span>
      {children}
    </div>
  );
}

/** What archiving means, said before the user confirms it (R8). */
export function ArchiveNote({ label }: { label: string }) {
  return (
    <p className="basis-full text-muted-foreground text-sm">
      « {label} » ne sera plus proposé à partir du mois choisi. Les mois précédents restent
      inchangés et tu peux annuler l'archivage.
    </p>
  );
}

/** Archived rows stay out of the list until asked for. */
export function ArchivedToggle({
  count,
  shown,
  onToggle,
}: {
  count: number;
  shown: boolean;
  onToggle: () => void;
}) {
  if (count === 0) return null;
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="max-md:h-11"
      aria-expanded={shown}
      onClick={onToggle}
    >
      {shown ? "Masquer les archivés" : `Voir les archivés (${count})`}
    </Button>
  );
}
