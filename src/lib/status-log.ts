import type { Prisma, PrismaClient, LieferscheinStatus, RechnungStatus } from "@prisma/client";

type Tx = PrismaClient | Prisma.TransactionClient;

export async function logLieferscheinStatus(
  tx: Tx,
  lieferscheinId: string,
  fromStatus: LieferscheinStatus | null,
  toStatus: LieferscheinStatus,
  userId: string | null,
  note?: string
) {
  if (fromStatus === toStatus) return;
  await tx.lieferscheinStatusLog.create({
    data: { lieferscheinId, fromStatus, toStatus, userId, note: note ?? null },
  });
}

export async function logRechnungStatus(
  tx: Tx,
  rechnungId: string,
  fromStatus: RechnungStatus | null,
  toStatus: RechnungStatus,
  userId: string | null,
  note?: string
) {
  if (fromStatus === toStatus) return;
  await tx.rechnungStatusLog.create({
    data: { rechnungId, fromStatus, toStatus, userId, note: note ?? null },
  });
}
