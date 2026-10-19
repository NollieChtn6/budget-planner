-- CreateEnum
CREATE TYPE "savings_transfer_kind" AS ENUM ('free', 'convertedUrge');

-- AlterTable
ALTER TABLE "savings_transfers" ADD COLUMN "kind" "savings_transfer_kind" NOT NULL DEFAULT 'free';

-- CheckConstraint: a converted urge always says what was given up (R38)
ALTER TABLE "savings_transfers" ADD CONSTRAINT "savings_transfers_converted_urge_label_check"
  CHECK (kind <> 'convertedUrge' OR (label IS NOT NULL AND btrim(label) <> ''));
