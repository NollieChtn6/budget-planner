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

async function requireOwnedEnvelope(
  prisma: PrismaClient,
  userId: string,
  envelopeId: string,
): Promise<void> {
  const owned = await prisma.variableEnvelope.findFirst({ where: { id: envelopeId, userId } });
  if (!owned) {
    throw new Error(`Variable envelope ${envelopeId} not found for this user`);
  }
}

export async function addVariableEnvelopeVersion(
  prisma: PrismaClient,
  userId: string,
  envelopeId: string,
  version: VariableEnvelopeVersion,
): Promise<VariableEnvelope> {
  await requireOwnedEnvelope(prisma, userId, envelopeId);

  const data = toPrismaVersionData(version);
  await prisma.variableEnvelopeVersion.upsert({
    where: { envelopeId_effectiveFrom: { envelopeId, effectiveFrom: data.effectiveFrom } },
    create: { envelopeId, ...data },
    update: data,
  });

  const updated = await findVariableEnvelopeById(prisma, userId, envelopeId);
  if (!updated) {
    throw new Error(`Variable envelope ${envelopeId} not found for this user`);
  }
  return updated;
}

export async function setVariableEnvelopeArchivedFrom(
  prisma: PrismaClient,
  userId: string,
  envelopeId: string,
  archivedFrom: Month | null,
): Promise<VariableEnvelope> {
  await requireOwnedEnvelope(prisma, userId, envelopeId);

  await prisma.variableEnvelope.update({
    where: { id: envelopeId },
    data: { archivedFrom: archivedFrom ? monthToDate(archivedFrom) : null },
  });

  const updated = await findVariableEnvelopeById(prisma, userId, envelopeId);
  if (!updated) {
    throw new Error(`Variable envelope ${envelopeId} not found for this user`);
  }
  return updated;
}
