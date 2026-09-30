-- CreateEnum
CREATE TYPE "provision_type" AS ENUM ('deadline', 'reserve');

-- CreateEnum
CREATE TYPE "provision_status" AS ENUM ('active', 'late', 'closed');

-- CreateTable
CREATE TABLE "provisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "type" "provision_type" NOT NULL,
    "target_cents" INTEGER NOT NULL,
    "status" "provision_status" NOT NULL DEFAULT 'active',
    "start_month" DATE,
    "duration_months" INTEGER,
    "monthly_amount_cents" INTEGER,
    "archived_from" DATE,
    "previous_cycle_id" UUID,

    CONSTRAINT "provisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "provisions_previous_cycle_id_key" ON "provisions"("previous_cycle_id");

-- CreateIndex
CREATE INDEX "provisions_user_id_idx" ON "provisions"("user_id");

-- AddForeignKey
ALTER TABLE "provisions" ADD CONSTRAINT "provisions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provisions" ADD CONSTRAINT "provisions_previous_cycle_id_fkey" FOREIGN KEY ("previous_cycle_id") REFERENCES "provisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CheckConstraint: exactly the fields of the provision's own type are set
ALTER TABLE "provisions" ADD CONSTRAINT "provisions_type_fields_check"
  CHECK ((type = 'deadline' AND start_month IS NOT NULL AND duration_months IS NOT NULL AND monthly_amount_cents IS NULL)
      OR (type = 'reserve' AND monthly_amount_cents IS NOT NULL AND start_month IS NULL AND duration_months IS NULL));

-- CheckConstraint: amounts are strictly positive
ALTER TABLE "provisions" ADD CONSTRAINT "provisions_target_cents_positive_check"
  CHECK (target_cents > 0);

ALTER TABLE "provisions" ADD CONSTRAINT "provisions_monthly_amount_cents_positive_check"
  CHECK (monthly_amount_cents IS NULL OR monthly_amount_cents > 0);

-- CheckConstraint: a deadline provision lasts at least one month
ALTER TABLE "provisions" ADD CONSTRAINT "provisions_duration_months_positive_check"
  CHECK (duration_months IS NULL OR duration_months > 0);

-- CheckConstraint: a provision can't be its own renewal
ALTER TABLE "provisions" ADD CONSTRAINT "provisions_previous_cycle_not_self_check"
  CHECK (previous_cycle_id IS NULL OR previous_cycle_id <> id);

-- CheckConstraint: months are stored as their first day (ADR-0007)
ALTER TABLE "provisions" ADD CONSTRAINT "provisions_start_month_is_month_start_check"
  CHECK (start_month IS NULL OR EXTRACT(DAY FROM start_month) = 1);

ALTER TABLE "provisions" ADD CONSTRAINT "provisions_archived_from_is_month_start_check"
  CHECK (archived_from IS NULL OR EXTRACT(DAY FROM archived_from) = 1);
