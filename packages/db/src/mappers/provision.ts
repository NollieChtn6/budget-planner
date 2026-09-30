import { moneyFromCents, moneyToCents, type Provision } from "@budget/domain";
import type { Provision as PrismaProvision } from "@prisma/client";
import { dateToMonth, monthToDate } from "./month";

export function toDomainProvision(row: PrismaProvision): Provision {
  const common = {
    id: row.id,
    label: row.label,
    target: moneyFromCents(row.targetCents),
    status: row.status,
    ...(row.archivedFrom ? { archivedFrom: dateToMonth(row.archivedFrom) } : {}),
    ...(row.previousCycleId ? { previousCycleId: row.previousCycleId } : {}),
  };

  if (row.type === "deadline") {
    // start_month/duration_months are guaranteed non-null for a deadline
    // provision by the provisions_type_fields_check DB constraint.
    return {
      ...common,
      type: "deadline",
      startMonth: dateToMonth(row.startMonth as Date),
      durationMonths: row.durationMonths as number,
    };
  }

  // Same guarantee as above, for monthly_amount_cents on a reserve.
  return {
    ...common,
    type: "reserve",
    monthlyAmount: moneyFromCents(row.monthlyAmountCents as number),
  };
}

export function toPrismaProvisionData(provision: Provision): {
  label: string;
  type: "deadline" | "reserve";
  targetCents: number;
  startMonth: Date | null;
  durationMonths: number | null;
  monthlyAmountCents: number | null;
} {
  const base = { label: provision.label, targetCents: moneyToCents(provision.target) };

  if (provision.type === "deadline") {
    return {
      ...base,
      type: "deadline",
      startMonth: monthToDate(provision.startMonth),
      durationMonths: provision.durationMonths,
      monthlyAmountCents: null,
    };
  }

  return {
    ...base,
    type: "reserve",
    startMonth: null,
    durationMonths: null,
    monthlyAmountCents: moneyToCents(provision.monthlyAmount),
  };
}
