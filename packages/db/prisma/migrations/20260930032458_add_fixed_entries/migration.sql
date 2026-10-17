-- CreateEnum
CREATE TYPE "fixed_entry_type" AS ENUM ('charge', 'scheduledSaving');

-- CreateTable
CREATE TABLE "fixed_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "type" "fixed_entry_type" NOT NULL,
    "archived_from" DATE,

    CONSTRAINT "fixed_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixed_entry_versions" (
    "fixed_entry_id" UUID NOT NULL,
    "effective_from" DATE NOT NULL,
    "amount_cents" INTEGER NOT NULL,

    CONSTRAINT "fixed_entry_versions_pkey" PRIMARY KEY ("fixed_entry_id","effective_from")
);

-- CreateIndex
CREATE INDEX "fixed_entries_user_id_idx" ON "fixed_entries"("user_id");

-- AddForeignKey
ALTER TABLE "fixed_entries" ADD CONSTRAINT "fixed_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_entry_versions" ADD CONSTRAINT "fixed_entry_versions_fixed_entry_id_fkey" FOREIGN KEY ("fixed_entry_id") REFERENCES "fixed_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CheckConstraint: amounts are never negative
ALTER TABLE "fixed_entry_versions" ADD CONSTRAINT "fixed_entry_versions_amount_cents_positive_check"
  CHECK (amount_cents >= 0);

-- CheckConstraint: months are stored as their first day (ADR-0007)
ALTER TABLE "fixed_entries" ADD CONSTRAINT "fixed_entries_archived_from_is_month_start_check"
  CHECK (archived_from IS NULL OR EXTRACT(DAY FROM archived_from) = 1);

ALTER TABLE "fixed_entry_versions" ADD CONSTRAINT "fixed_entry_versions_effective_from_is_month_start_check"
  CHECK (EXTRACT(DAY FROM effective_from) = 1);
