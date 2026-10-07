import { type LeftoverAllocation, moneyToCents } from "@budget/domain";

/** Write-only: nothing reads LeftoverAllocation rows back yet (reopening, R29, will need to). */
export function toPrismaLeftoverAllocationData(allocation: LeftoverAllocation): {
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
