import type { FixedEntry, FixedEntryType, FixedEntryVersion, Month } from "@budget/domain";
import type { PrismaClient } from "@prisma/client";
import { toDomainFixedEntry, toPrismaFixedEntryVersionData } from "../mappers/fixed-entry";
import { monthToDate } from "../mappers/month";

const WITH_VERSIONS = { versions: true } as const;

export async function findFixedEntriesByUser(
  prisma: PrismaClient,
  userId: string,
): Promise<FixedEntry[]> {
  const rows = await prisma.fixedEntry.findMany({
    where: { userId },
    include: WITH_VERSIONS,
  });
  return rows.map(toDomainFixedEntry);
}

export async function findFixedEntryById(
  prisma: PrismaClient,
  userId: string,
  fixedEntryId: string,
): Promise<FixedEntry | null> {
  const row = await prisma.fixedEntry.findFirst({
    where: { id: fixedEntryId, userId },
    include: WITH_VERSIONS,
  });
  return row ? toDomainFixedEntry(row) : null;
}

export async function createFixedEntry(
  prisma: PrismaClient,
  userId: string,
  input: { label: string; type: FixedEntryType; firstVersion: FixedEntryVersion },
): Promise<FixedEntry> {
  const row = await prisma.fixedEntry.create({
    data: {
      userId,
      label: input.label,
      type: input.type,
      versions: { create: toPrismaFixedEntryVersionData(input.firstVersion) },
    },
    include: WITH_VERSIONS,
  });
  return toDomainFixedEntry(row);
}

/**
 * Adds or replaces the version at this effectiveFrom. The update path is
 * scoped by userId directly in its WHERE (ADR-0011); the create path can't
 * be (Prisma create has no WHERE), so it's guarded by an explicit ownership
 * check instead.
 *
 * Named distinctly from the domain layer's `addFixedEntryVersion` (unlike
 * VariableEnvelope's `addVersion`/`addVariableEnvelopeVersion` split) so both
 * can be imported together without aliasing.
 */
export async function persistFixedEntryVersion(
  prisma: PrismaClient,
  userId: string,
  fixedEntryId: string,
  version: FixedEntryVersion,
): Promise<FixedEntry> {
  const data = toPrismaFixedEntryVersionData(version);
  const updated = await prisma.fixedEntryVersion.updateMany({
    where: { fixedEntryId, effectiveFrom: data.effectiveFrom, fixedEntry: { userId } },
    data,
  });

  if (updated.count === 0) {
    const owned = await prisma.fixedEntry.findFirst({
      where: { id: fixedEntryId, userId },
      select: { id: true },
    });
    if (!owned) {
      throw new Error(`Fixed entry ${fixedEntryId} not found for this user`);
    }
    await prisma.fixedEntryVersion.create({ data: { fixedEntryId, ...data } });
  }

  const result = await findFixedEntryById(prisma, userId, fixedEntryId);
  if (!result) {
    throw new Error(`Fixed entry ${fixedEntryId} not found for this user`);
  }
  return result;
}

export async function setFixedEntryArchivedFrom(
  prisma: PrismaClient,
  userId: string,
  fixedEntryId: string,
  archivedFrom: Month | null,
): Promise<FixedEntry> {
  const updated = await prisma.fixedEntry.updateMany({
    where: { id: fixedEntryId, userId },
    data: { archivedFrom: archivedFrom ? monthToDate(archivedFrom) : null },
  });
  if (updated.count === 0) {
    throw new Error(`Fixed entry ${fixedEntryId} not found for this user`);
  }

  const result = await findFixedEntryById(prisma, userId, fixedEntryId);
  if (!result) {
    throw new Error(`Fixed entry ${fixedEntryId} not found for this user`);
  }
  return result;
}
