import {
  type LeftoverAllocation,
  type LeftoverAllocationInput,
  moneyFromCents,
  moneyToCents,
} from "@budget/domain";
import type { LeftoverAllocation as PrismaLeftoverAllocation } from "@prisma/client";

export function toDomainLeftoverAllocation(row: PrismaLeftoverAllocation): LeftoverAllocation {
  const amount = moneyFromCents(row.amountCents);
  switch (row.destination) {
    case "provision":
      return {
        id: row.id,
        destination: "provision",
        provisionId: row.provisionId as string,
        amount,
      };
    case "envelope":
      return { id: row.id, destination: "envelope", envelopeId: row.envelopeId as string, amount };
    case "report":
      return { id: row.id, destination: "report", amount };
    case "savings":
      return { id: row.id, destination: "savings", amount };
  }
}

export function toPrismaLeftoverAllocationData(allocation: LeftoverAllocationInput): {
  destination: "savings" | "provision" | "envelope" | "report";
  provisionId: string | null;
  envelopeId: string | null;
  amountCents: number;
} {
  return {
    destination: allocation.destination,
    provisionId: allocation.destination === "provision" ? allocation.provisionId : null,
    envelopeId: allocation.destination === "envelope" ? allocation.envelopeId : null,
    amountCents: moneyToCents(allocation.amount),
  };
}
