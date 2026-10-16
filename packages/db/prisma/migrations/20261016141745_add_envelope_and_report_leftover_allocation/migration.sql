-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "leftover_allocation_destination" ADD VALUE 'envelope';
ALTER TYPE "leftover_allocation_destination" ADD VALUE 'report';

-- AlterTable
ALTER TABLE "leftover_allocations" ADD COLUMN     "envelope_id" UUID;

-- AddForeignKey
ALTER TABLE "leftover_allocations" ADD CONSTRAINT "leftover_allocations_envelope_id_fkey" FOREIGN KEY ("envelope_id") REFERENCES "variable_envelopes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
