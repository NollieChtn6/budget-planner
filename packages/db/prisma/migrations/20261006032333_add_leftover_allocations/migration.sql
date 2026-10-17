-- CreateEnum
CREATE TYPE "leftover_allocation_destination" AS ENUM ('savings', 'provision');

-- CreateTable
CREATE TABLE "leftover_allocations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "budget_month_id" UUID NOT NULL,
    "provision_id" UUID,
    "destination" "leftover_allocation_destination" NOT NULL,
    "amount_cents" INTEGER NOT NULL,

    CONSTRAINT "leftover_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leftover_allocations_budget_month_id_idx" ON "leftover_allocations"("budget_month_id");

-- AddForeignKey
ALTER TABLE "leftover_allocations" ADD CONSTRAINT "leftover_allocations_budget_month_id_fkey" FOREIGN KEY ("budget_month_id") REFERENCES "budget_months"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leftover_allocations" ADD CONSTRAINT "leftover_allocations_provision_id_fkey" FOREIGN KEY ("provision_id") REFERENCES "provisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CheckConstraint: provision_id is set if and only if the destination is a provision
ALTER TABLE "leftover_allocations" ADD CONSTRAINT "leftover_allocations_destination_check"
  CHECK ((destination = 'provision' AND provision_id IS NOT NULL)
      OR (destination = 'savings' AND provision_id IS NULL));

-- CheckConstraint: an allocation amount is always strictly positive
ALTER TABLE "leftover_allocations" ADD CONSTRAINT "leftover_allocations_amount_cents_positive_check"
  CHECK (amount_cents > 0);
