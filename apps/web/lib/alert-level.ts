import type { ConsumptionLevel } from "@budget/domain";

/** R16's labels, docs/ui/pecule_charte_V_01.html "Niveaux d'alerte des enveloppes". */
export const CONSUMPTION_LEVEL_LABELS: Record<ConsumptionLevel, string> = {
  ok: "Tranquille",
  watch: "À surveiller",
  caution: "Attention",
  warning: "Alerte",
  critical: "Presque vide",
  exceeded: "Dépassement",
};

export const CONSUMPTION_LEVEL_TEXT_CLASSES: Record<ConsumptionLevel, string> = {
  ok: "text-alert-ok",
  watch: "text-alert-watch",
  caution: "text-alert-caution",
  warning: "text-alert-warning",
  critical: "text-alert-critical",
  exceeded: "text-alert-exceeded",
};

export const CONSUMPTION_LEVEL_BG_CLASSES: Record<ConsumptionLevel, string> = {
  ok: "bg-alert-ok",
  watch: "bg-alert-watch",
  caution: "bg-alert-caution",
  warning: "bg-alert-warning",
  critical: "bg-alert-critical",
  exceeded: "bg-alert-exceeded",
};
