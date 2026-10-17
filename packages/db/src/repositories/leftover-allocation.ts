import type { LeftoverAllocation, Month } from "@budget/domain";
import type { PrismaClient } from "@prisma/client";
import { toDomainLeftoverAllocation } from "../mappers/leftover-allocation";
import { monthToDate } from "../mappers/month";

/**
 * Every allocation ever recorded for the month, across every closing (R29:
 * reopening keeps past splits rather than erasing them). No direct userId on
 * the row — isolation passes through the budgetMonth relation, like the
 * snapshot rows (docs/adr/0011-user-scoped-repositories.md).
 */
export async function findLeftoverAllocationsByUserAndMonth(
  prisma: PrismaClient,
  userId: string,
  month: Month,
): Promise<LeftoverAllocation[]> {
  const rows = await prisma.leftoverAllocation.findMany({
    where: { budgetMonth: { userId, month: monthToDate(month) } },
  });
  return rows.map(toDomainLeftoverAllocation);
}
