import {
  type LeftoverAllocation,
  type LeftoverAllocationInput,
  moneyFromCents,
  moneyToCents,
} from "@budget/domain";
import type { LeftoverAllocation as PrismaLeftoverAllocation } from "@prisma/client";

export function toDomainLeftoverAllocation(row: PrismaLeftoverAllocation): LeftoverAllocation {
  return row.destination === "provision"
    ? {
        id: row.id,
        destination: "provision",
        provisionId: row.provisionId as string,
        amount: moneyFromCents(row.amountCents),
      }
    : { id: row.id, destination: "savings", amount: moneyFromCents(row.amountCents) };
}

export function toPrismaLeftoverAllocationData(allocation: LeftoverAllocationInput): {
  destination: "savings" | "provision";
  provisionId: string | null;
  amountCents: number;
} {
  return {
    destination: allocation.destination,
    provisionId: allocation.destination === "provision" ? allocation.provisionId : null,
    amountCents: moneyToCents(allocation.amount),
  };
}
