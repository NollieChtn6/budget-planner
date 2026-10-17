-- CheckConstraint: provision_id is set iff destination is provision; envelope_id is
-- set iff destination is envelope (R31); savings/report never carry either id (R32).
-- Split into its own migration: a CHECK referencing a new enum value can't run in the
-- same transaction as the ALTER TYPE that added it.
ALTER TABLE "leftover_allocations" DROP CONSTRAINT "leftover_allocations_destination_check";

ALTER TABLE "leftover_allocations" ADD CONSTRAINT "leftover_allocations_destination_check"
  CHECK ((destination = 'provision' AND provision_id IS NOT NULL AND envelope_id IS NULL)
      OR (destination = 'envelope' AND envelope_id IS NOT NULL AND provision_id IS NULL)
      OR (destination IN ('savings', 'report') AND provision_id IS NULL AND envelope_id IS NULL));
