-- Le libellé d'un poste fixe / d'une enveloppe variable devient versionné
-- comme son montant (R7, docs/domain/model.md) : le renommer demande
-- désormais la même date d'effet qu'une modification de montant/mode/valeur.

-- AlterTable
ALTER TABLE "fixed_entry_versions" ADD COLUMN "label" TEXT;

-- Backfill: chaque version existante reprend le libellé actuel de son poste fixe.
UPDATE "fixed_entry_versions" v
SET "label" = fe."label"
FROM "fixed_entries" fe
WHERE fe."id" = v."fixed_entry_id";

ALTER TABLE "fixed_entry_versions" ALTER COLUMN "label" SET NOT NULL;

-- AlterTable
ALTER TABLE "fixed_entries" DROP COLUMN "label";

-- AlterTable
ALTER TABLE "variable_envelope_versions" ADD COLUMN "label" TEXT;

-- Backfill: chaque version existante reprend le libellé actuel de son enveloppe.
UPDATE "variable_envelope_versions" v
SET "label" = ve."label"
FROM "variable_envelopes" ve
WHERE ve."id" = v."envelope_id";

ALTER TABLE "variable_envelope_versions" ALTER COLUMN "label" SET NOT NULL;

-- AlterTable
ALTER TABLE "variable_envelopes" DROP COLUMN "label";
