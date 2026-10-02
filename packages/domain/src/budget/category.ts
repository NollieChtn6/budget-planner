/**
 * Unlike FixedEntry/VariableEnvelope/Provision, a category is never copied
 * into a month snapshot (docs/domain/model.md): archiving it takes effect
 * immediately and never needs an effective-date choice (R7/R8 don't apply).
 * It still can't be deleted once used by an expense, to keep that expense's
 * history intact — so it's archived instead, exactly like the others.
 */
export type Category = {
  id: string;
  label: string;
  defaultEnvelopeId?: string;
  archived: boolean;
};

export function archiveCategory(category: Category): Category {
  return { ...category, archived: true };
}

export function unarchiveCategory(category: Category): Category {
  return { ...category, archived: false };
}
