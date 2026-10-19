-- AlterEnum
ALTER TYPE "contribution_origin" ADD VALUE 'disposableIncome';

-- CreateTable
CREATE TABLE "extra_incomes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extra_incomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "savings_transfers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "savings_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "extra_incomes_user_id_idx" ON "extra_incomes"("user_id");

-- CreateIndex
CREATE INDEX "savings_transfers_user_id_idx" ON "savings_transfers"("user_id");

-- AddForeignKey
ALTER TABLE "extra_incomes" ADD CONSTRAINT "extra_incomes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_transfers" ADD CONSTRAINT "savings_transfers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CheckConstraint: an extra income amount is always strictly positive
ALTER TABLE "extra_incomes" ADD CONSTRAINT "extra_incomes_amount_cents_positive_check"
  CHECK (amount_cents > 0);

-- CheckConstraint: a savings transfer amount is always strictly positive
ALTER TABLE "savings_transfers" ADD CONSTRAINT "savings_transfers_amount_cents_positive_check"
  CHECK (amount_cents > 0);
