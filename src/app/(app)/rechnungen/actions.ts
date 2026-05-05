"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { nextRechnungNummer } from "@/lib/numbering";
import { sendMail } from "@/lib/mail";
import { renderEmail } from "@/lib/email-templates";
import { storeRechnungPdf, readRechnungPdf } from "@/lib/storage";
import { aggregateLieferscheine, renderRechnungBuffer } from "./render";
import { formatDate } from "@/lib/dates";
import { formatEur } from "@/lib/money";
import { logRechnungStatus } from "@/lib/status-log";

const Decimal = Prisma.Decimal;

const generateSchema = z.object({
  kundeId: z.string().min(1),
  von: z.string().min(1),
  bis: z.string().min(1),
});

export async function generateRechnung(_: unknown, form: FormData) {
  const admin = await requireAdmin();
  const parsed = generateSchema.safeParse({
    kundeId: form.get("kundeId"),
    von: form.get("von"),
    bis: form.get("bis"),
  });
  if (!parsed.success) return { ok: false as const, error: parsed.error.errors[0].message };

  const von = new Date(parsed.data.von + "T00:00:00.000Z");
  const bis = new Date(parsed.data.bis + "T23:59:59.999Z");

  const kunde = await prisma.kunde.findUnique({ where: { id: parsed.data.kundeId } });
  if (!kunde) return { ok: false as const, error: "Kunde nicht gefunden." };

  const lieferscheine = await prisma.lieferschein.findMany({
    where: {
      kundeId: parsed.data.kundeId,
      datum: { gte: von, lte: bis },
      status: { in: ["Unterschrieben", "Versendet"] },
      rechnungen: { none: {} },
    },
    include: { positionen: { include: { produkt: true } } },
    orderBy: { datum: "asc" },
  });
  if (lieferscheine.length === 0) {
    return { ok: false as const, error: "Keine offenen Lieferscheine in diesem Zeitraum." };
  }

  const agg = aggregateLieferscheine(lieferscheine);
  const nummer = await nextRechnungNummer(kunde.kuerzel);

  const rechnung = await prisma.rechnung.create({
    data: {
      nummer,
      kundeId: kunde.id,
      zeitraumVon: von,
      zeitraumBis: bis,
      datum: new Date(),
      status: "Entwurf",
      nettoBetrag: agg.netto,
      mwstBetrag: new Decimal(agg.mwst7).plus(agg.mwst19),
      bruttoBetrag: agg.brutto,
      lieferscheine: { connect: lieferscheine.map((l) => ({ id: l.id })) },
    },
  });
  await logRechnungStatus(
    prisma,
    rechnung.id,
    null,
    "Entwurf",
    admin.id,
    `Erstellt aus ${lieferscheine.length} Lieferschein(en)`
  );

  revalidatePath("/rechnungen");
  redirect(`/rechnungen/${rechnung.id}`);
}

export async function freigebenRechnung(id: string) {
  const admin = await requireAdmin();
  const rechnung = await prisma.rechnung.findUnique({
    where: { id },
    include: {
      kunde: true,
      lieferscheine: {
        include: { positionen: { include: { produkt: true } } },
        orderBy: { datum: "asc" },
      },
    },
  });
  if (!rechnung) return { ok: false as const, error: "Nicht gefunden." };
  if (rechnung.status !== "Entwurf") return { ok: false as const, error: "Bereits freigegeben." };

  const buffer = await renderRechnungBuffer(rechnung);
  const pdfUrl = await storeRechnungPdf(rechnung.nummer, buffer);

  await prisma.rechnung.update({
    where: { id },
    data: { status: "Freigegeben", pdfUrl },
  });
  await logRechnungStatus(prisma, id, "Entwurf", "Freigegeben", admin.id, "PDF archiviert");
  revalidatePath(`/rechnungen/${id}`);
  revalidatePath("/rechnungen");
  return { ok: true as const };
}

export async function sendRechnung(id: string) {
  const admin = await requireAdmin();
  const rechnung = await prisma.rechnung.findUnique({
    where: { id },
    include: { kunde: true },
  });
  if (!rechnung) return { ok: false as const, error: "Nicht gefunden." };
  if (rechnung.status === "Entwurf") return { ok: false as const, error: "Erst freigeben." };
  if (!rechnung.pdfUrl) return { ok: false as const, error: "Kein PDF archiviert." };
  if (!rechnung.kunde.email) return { ok: false as const, error: "Keine E-Mail beim Kunden." };

  const buffer = await readRechnungPdf(rechnung.pdfUrl);
  const settings = await prisma.einstellungen.findUnique({ where: { id: "singleton" } });
  if (!settings) return { ok: false as const, error: "Einstellungen fehlen." };

  const subject = `Rechnung ${rechnung.nummer} – ${settings.firmenname}`;
  const { html, text } = await renderEmail({
    template: "rechnung",
    title: subject,
    firm: settings,
    vars: {
      nummer: rechnung.nummer,
      datum: formatDate(rechnung.datum),
      zeitraumVon: formatDate(rechnung.zeitraumVon),
      zeitraumBis: formatDate(rechnung.zeitraumBis),
      brutto: formatEur(rechnung.bruttoBetrag),
    },
  });
  await sendMail({
    to: rechnung.kunde.email,
    subject,
    html,
    text,
    attachments: [{ filename: `${rechnung.nummer}.pdf`, content: buffer, contentType: "application/pdf" }],
  });
  const previousStatus = rechnung.status;
  await prisma.rechnung.update({ where: { id }, data: { status: "Versendet" } });
  await logRechnungStatus(
    prisma,
    id,
    previousStatus,
    "Versendet",
    admin.id,
    `E-Mail an ${rechnung.kunde.email}`
  );
  revalidatePath(`/rechnungen/${id}`);
  revalidatePath("/rechnungen");
  return { ok: true as const };
}
