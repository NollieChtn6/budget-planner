-- CreateEnum
CREATE TYPE "contribution_origin" AS ENUM ('manual', 'closing');

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "provision_id" UUID,
ADD COLUMN     "savings_draw_cents" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "envelope_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "contributions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provision_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "origin" "contribution_origin" NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contributions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contributions_user_id_idx" ON "contributions"("user_id");

-- CreateIndex
CREATE INDEX "contributions_provision_id_idx" ON "contributions"("provision_id");

-- CreateIndex
CREATE INDEX "expenses_provision_id_idx" ON "expenses"("provision_id");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_provision_id_fkey" FOREIGN KEY ("provision_id") REFERENCES "provisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_provision_id_fkey" FOREIGN KEY ("provision_id") REFERENCES "provisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CheckConstraint: an expense targets exactly one of an envelope or a provision
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_target_check"
  CHECK ((envelope_id IS NOT NULL AND provision_id IS NULL)
      OR (envelope_id IS NULL AND provision_id IS NOT NULL));

-- CheckConstraint: R22 — the savings draw is never negative and never exceeds the expense amount
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_savings_draw_cents_range_check"
  CHECK (savings_draw_cents >= 0 AND savings_draw_cents <= amount_cents);

-- CheckConstraint: a contribution amount is always strictly positive
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_amount_cents_positive_check"
  CHECK (amount_cents > 0);
