import type { Month, VariableEnvelope, VariableEnvelopeVersion } from "@budget/domain";
import type { PrismaClient } from "@prisma/client";
import {
  monthToDate,
  toDomainVariableEnvelope,
  toPrismaVersionData,
} from "../mappers/variable-envelope";

const WITH_VERSIONS = { versions: true } as const;

export async function findVariableEnvelopesByUser(
  prisma: PrismaClient,
  userId: string,
): Promise<VariableEnvelope[]> {
  const rows = await prisma.variableEnvelope.findMany({
    where: { userId },
    include: WITH_VERSIONS,
  });
  return rows.map(toDomainVariableEnvelope);
}

export async function findVariableEnvelopeById(
  prisma: PrismaClient,
  userId: string,
  envelopeId: string,
): Promise<VariableEnvelope | null> {
  const row = await prisma.variableEnvelope.findFirst({
    where: { id: envelopeId, userId },
    include: WITH_VERSIONS,
  });
  return row ? toDomainVariableEnvelope(row) : null;
}

export async function createVariableEnvelope(
  prisma: PrismaClient,
  userId: string,
  input: { label: string; firstVersion: VariableEnvelopeVersion },
): Promise<VariableEnvelope> {
  const row = await prisma.variableEnvelope.create({
    data: {
      userId,
      label: input.label,
      versions: { create: toPrismaVersionData(input.firstVersion) },
    },
    include: WITH_VERSIONS,
  });
  return toDomainVariableEnvelope(row);
}

/**
 * Adds or replaces the version at this effectiveFrom. The update path is
 * scoped by userId directly in its WHERE (ADR-0011); the create path can't
 * be (Prisma create has no WHERE), so it's guarded by an explicit ownership
 * check instead.
 */
export async function addVariableEnvelopeVersion(
  prisma: PrismaClient,
  userId: string,
  envelopeId: string,
  version: VariableEnvelopeVersion,
): Promise<VariableEnvelope> {
  const data = toPrismaVersionData(version);
  const updated = await prisma.variableEnvelopeVersion.updateMany({
    where: { envelopeId, effectiveFrom: data.effectiveFrom, envelope: { userId } },
    data,
  });

  if (updated.count === 0) {
    const owned = await prisma.variableEnvelope.findFirst({
      where: { id: envelopeId, userId },
      select: { id: true },
    });
    if (!owned) {
      throw new Error(`Variable envelope ${envelopeId} not found for this user`);
    }
    await prisma.variableEnvelopeVersion.create({ data: { envelopeId, ...data } });
  }

  const result = await findVariableEnvelopeById(prisma, userId, envelopeId);
  if (!result) {
    throw new Error(`Variable envelope ${envelopeId} not found for this user`);
  }
  return result;
}

export async function setVariableEnvelopeArchivedFrom(
  prisma: PrismaClient,
  userId: string,
  envelopeId: string,
  archivedFrom: Month | null,
): Promise<VariableEnvelope> {
  const updated = await prisma.variableEnvelope.updateMany({
    where: { id: envelopeId, userId },
    data: { archivedFrom: archivedFrom ? monthToDate(archivedFrom) : null },
  });
  if (updated.count === 0) {
    throw new Error(`Variable envelope ${envelopeId} not found for this user`);
  }

  const result = await findVariableEnvelopeById(prisma, userId, envelopeId);
  if (!result) {
    throw new Error(`Variable envelope ${envelopeId} not found for this user`);
  }
  return result;
}
