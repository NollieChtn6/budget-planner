-- CreateEnum
CREATE TYPE "budget_month_status" AS ENUM ('open', 'closed');

-- CreateEnum
CREATE TYPE "pointage_status" AS ENUM ('planned', 'done');

-- CreateTable
CREATE TABLE "budget_months" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "month" DATE NOT NULL,
    "status" "budget_month_status" NOT NULL DEFAULT 'open',
    "income_cents" INTEGER NOT NULL,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "reopened_at" TIMESTAMP(3),

    CONSTRAINT "budget_months_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snapshot_fixed_entries" (
    "budget_month_id" UUID NOT NULL,
    "fixed_entry_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "type" "fixed_entry_type" NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "status" "pointage_status" NOT NULL DEFAULT 'planned',

    CONSTRAINT "snapshot_fixed_entries_pkey" PRIMARY KEY ("budget_month_id","fixed_entry_id")
);

-- CreateTable
CREATE TABLE "snapshot_envelope_budgets" (
    "budget_month_id" UUID NOT NULL,
    "envelope_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "mode" "variable_envelope_version_mode" NOT NULL,
    "amount_cents" INTEGER,
    "percentage" INTEGER,
    "budget_cents" INTEGER NOT NULL,

    CONSTRAINT "snapshot_envelope_budgets_pkey" PRIMARY KEY ("budget_month_id","envelope_id")
);

-- CreateTable
CREATE TABLE "snapshot_provision_targets" (
    "budget_month_id" UUID NOT NULL,
    "provision_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "target_cents" INTEGER NOT NULL,

    CONSTRAINT "snapshot_provision_targets_pkey" PRIMARY KEY ("budget_month_id","provision_id")
);

-- CreateIndex
CREATE INDEX "budget_months_user_id_idx" ON "budget_months"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "budget_months_user_id_month_key" ON "budget_months"("user_id", "month");

-- AddForeignKey
ALTER TABLE "budget_months" ADD CONSTRAINT "budget_months_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snapshot_fixed_entries" ADD CONSTRAINT "snapshot_fixed_entries_budget_month_id_fkey" FOREIGN KEY ("budget_month_id") REFERENCES "budget_months"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snapshot_fixed_entries" ADD CONSTRAINT "snapshot_fixed_entries_fixed_entry_id_fkey" FOREIGN KEY ("fixed_entry_id") REFERENCES "fixed_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snapshot_envelope_budgets" ADD CONSTRAINT "snapshot_envelope_budgets_budget_month_id_fkey" FOREIGN KEY ("budget_month_id") REFERENCES "budget_months"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snapshot_envelope_budgets" ADD CONSTRAINT "snapshot_envelope_budgets_envelope_id_fkey" FOREIGN KEY ("envelope_id") REFERENCES "variable_envelopes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snapshot_provision_targets" ADD CONSTRAINT "snapshot_provision_targets_budget_month_id_fkey" FOREIGN KEY ("budget_month_id") REFERENCES "budget_months"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snapshot_provision_targets" ADD CONSTRAINT "snapshot_provision_targets_provision_id_fkey" FOREIGN KEY ("provision_id") REFERENCES "provisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CheckConstraint: income can't be negative
ALTER TABLE "budget_months" ADD CONSTRAINT "budget_months_income_cents_not_negative_check"
  CHECK (income_cents >= 0);

-- CheckConstraint: months are stored as their first day (ADR-0007)
ALTER TABLE "budget_months" ADD CONSTRAINT "budget_months_month_is_month_start_check"
  CHECK (EXTRACT(DAY FROM month) = 1);

-- CheckConstraint: a frozen fixed entry amount can't be negative
ALTER TABLE "snapshot_fixed_entries" ADD CONSTRAINT "snapshot_fixed_entries_amount_cents_not_negative_check"
  CHECK (amount_cents >= 0);

-- CheckConstraint: exactly the field of the envelope's own mode is set (R10/R12)
ALTER TABLE "snapshot_envelope_budgets" ADD CONSTRAINT "snapshot_envelope_budgets_mode_fields_check"
  CHECK ((mode = 'amount' AND amount_cents IS NOT NULL AND percentage IS NULL)
      OR (mode = 'percentage' AND percentage IS NOT NULL AND amount_cents IS NULL));

-- CheckConstraint: a frozen envelope budget can't be negative (R13 clamps it to 0)
ALTER TABLE "snapshot_envelope_budgets" ADD CONSTRAINT "snapshot_envelope_budgets_budget_cents_not_negative_check"
  CHECK (budget_cents >= 0);

-- CheckConstraint: a frozen provision target can't be negative (R18/R21 clamp it to 0)
ALTER TABLE "snapshot_provision_targets" ADD CONSTRAINT "snapshot_provision_targets_target_cents_not_negative_check"
  CHECK (target_cents >= 0);
