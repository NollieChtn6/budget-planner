-- CreateEnum
CREATE TYPE "variable_envelope_version_mode" AS ENUM ('amount', 'percentage');

-- CreateTable
CREATE TABLE "variable_envelopes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "archived_from" DATE,

    CONSTRAINT "variable_envelopes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variable_envelope_versions" (
    "envelope_id" UUID NOT NULL,
    "effective_from" DATE NOT NULL,
    "mode" "variable_envelope_version_mode" NOT NULL,
    "amount_cents" INTEGER,
    "percentage" INTEGER,

    CONSTRAINT "variable_envelope_versions_pkey" PRIMARY KEY ("envelope_id","effective_from")
);

-- CreateIndex
CREATE INDEX "variable_envelopes_user_id_idx" ON "variable_envelopes"("user_id");

-- AddForeignKey
ALTER TABLE "variable_envelopes" ADD CONSTRAINT "variable_envelopes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variable_envelope_versions" ADD CONSTRAINT "variable_envelope_versions_envelope_id_fkey" FOREIGN KEY ("envelope_id") REFERENCES "variable_envelopes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CheckConstraint: exactly one of amount_cents/percentage set, matching the version's mode
ALTER TABLE "variable_envelope_versions" ADD CONSTRAINT "variable_envelope_versions_mode_value_check"
  CHECK ((mode = 'amount' AND amount_cents IS NOT NULL AND percentage IS NULL)
      OR (mode = 'percentage' AND percentage IS NOT NULL AND amount_cents IS NULL));

-- CheckConstraint: amounts are never negative
ALTER TABLE "variable_envelope_versions" ADD CONSTRAINT "variable_envelope_versions_amount_cents_positive_check"
  CHECK (amount_cents IS NULL OR amount_cents >= 0);

-- CheckConstraint: percentages stay within 0-100
ALTER TABLE "variable_envelope_versions" ADD CONSTRAINT "variable_envelope_versions_percentage_range_check"
  CHECK (percentage IS NULL OR (percentage >= 0 AND percentage <= 100));

-- CheckConstraint: months are stored as their first day (ADR-0007)
ALTER TABLE "variable_envelopes" ADD CONSTRAINT "variable_envelopes_archived_from_is_month_start_check"
  CHECK (archived_from IS NULL OR EXTRACT(DAY FROM archived_from) = 1);

ALTER TABLE "variable_envelope_versions" ADD CONSTRAINT "variable_envelope_versions_effective_from_is_month_start_check"
  CHECK (EXTRACT(DAY FROM effective_from) = 1);
