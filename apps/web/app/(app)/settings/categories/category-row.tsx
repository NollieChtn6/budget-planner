"use client";

import { useActionState, useEffect, useState } from "react";
import {
  archiveCategoryAction,
  unarchiveCategoryAction,
  updateCategoryAction,
} from "@/actions/category";
import { initialVariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { EditableRow } from "@/components/editable-row";
import { CardCell, CardRow, CardTapTarget } from "@/components/responsive-table";
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
import { NO_DEFAULT_ENVELOPE } from "@/schemas/category";
import { FormActions, FormField, OtherActions, SETTINGS_FORM_CLASS } from "../settings-form-parts";
import type { CategoryRowData, EnvelopeOption } from "./category-table";

export function CategoryRow({
  category,
  envelopeOptions,
}: {
  category: CategoryRowData;
  envelopeOptions: EnvelopeOption[];
}) {
  const [editing, setEditing] = useState(false);

  const [updateState, updateAction, updatePending] = useActionState(
    updateCategoryAction,
    initialVariableEnvelopeActionState,
  );
  const [archiveState, archiveAction, archivePending] = useActionState(
    archiveCategoryAction,
    initialVariableEnvelopeActionState,
  );
  const [unarchiveState, unarchiveAction, unarchivePending] = useActionState(
    unarchiveCategoryAction,
    initialVariableEnvelopeActionState,
  );

  useEffect(() => {
    if (updateState.status === "success") setEditing(false);
  }, [updateState.status]);
  useEffect(() => {
    if (archiveState.status === "success") setEditing(false);
  }, [archiveState.status]);

  const cancel = () => setEditing(false);

  const read = (
    <CardRow className={category.archived ? "text-muted-foreground" : undefined}>
      <CardCell heading className="whitespace-normal font-medium">
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          {category.label}
        </span>
        {category.archived ? (
          <div className="font-normal text-muted-foreground text-xs">Archivée</div>
        ) : (
          <CardTapTarget label={`Modifier ${category.label}`} onClick={() => setEditing(true)} />
        )}
      </CardCell>
      <CardCell label="Enveloppe par défaut" className="whitespace-normal">
        {category.defaultEnvelopeLabel ?? (
          <span className="text-muted-foreground">Au choix à chaque saisie</span>
        )}
      </CardCell>
      <CardCell hideOnMobile={!category.archived} className="whitespace-normal text-right">
        {category.archived ? (
          <form action={unarchiveAction} className="inline">
            <input type="hidden" name="categoryId" value={category.id} />
            <Button
              type="submit"
              variant="link"
              size="sm"
              className="max-md:h-11"
              disabled={unarchivePending}
            >
              Réactiver
            </Button>
          </form>
        ) : (
          <Button
            type="button"
            variant="link"
            size="sm"
            aria-label={`Modifier ${category.label}`}
            onClick={() => setEditing(true)}
          >
            Modifier
          </Button>
        )}
        {unarchiveState.status === "error" ? (
          <FieldError>{unarchiveState.message}</FieldError>
        ) : null}
      </CardCell>
    </CardRow>
  );

  return (
    <EditableRow
      isEditing={editing}
      onClose={cancel}
      title={`Modifier « ${category.label} »`}
      read={read}
      colSpan={3}
    >
      <form action={updateAction} className={SETTINGS_FORM_CLASS}>
        <input type="hidden" name="categoryId" value={category.id} />
        <FormField label="Couleur">
          {(id) => (
            <Input
              id={id}
              name="color"
              type="color"
              defaultValue={category.color}
              required
              className="h-8 w-14 p-1"
            />
          )}
        </FormField>
        <FormField label="Libellé">
          {(id) => (
            <Input
              id={id}
              name="label"
              defaultValue={category.label}
              required
              className="w-full md:w-40"
            />
          )}
        </FormField>
        <FormField label="Enveloppe par défaut">
          {(id) => (
            <Select
              name="defaultEnvelopeId"
              defaultValue={category.defaultEnvelopeId ?? NO_DEFAULT_ENVELOPE}
            >
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
          <Button type="submit" size="sm" disabled={updatePending}>
            {updatePending ? "Enregistrement..." : "Valider"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={cancel}>
            Annuler
          </Button>
        </FormActions>
        {updateState.status === "error" ? (
          <FieldError className="basis-full">{updateState.message}</FieldError>
        ) : null}
      </form>
      <OtherActions>
        <form action={archiveAction}>
          <input type="hidden" name="categoryId" value={category.id} />
          <Button type="submit" size="sm" variant="outline" disabled={archivePending}>
            {archivePending ? "Archivage..." : "Archiver"}
          </Button>
        </form>
        <span className="text-muted-foreground text-xs max-md:text-sm">
          Les dépenses déjà saisies gardent leur catégorie ; tu peux la réactiver.
        </span>
      </OtherActions>
      {archiveState.status === "error" ? <FieldError>{archiveState.message}</FieldError> : null}
    </EditableRow>
  );
}
