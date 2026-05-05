"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireUser, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { nextLieferscheinNummer } from "@/lib/numbering";
import { sendMail } from "@/lib/mail";
import { renderEmail } from "@/lib/email-templates";
import { renderPdfBuffer, getLogoBase64 } from "@/lib/pdf-render";
import { LieferscheinDocument } from "@/pdf/Lieferschein";
import { formatDate } from "@/lib/dates";
import { logLieferscheinStatus } from "@/lib/status-log";
import { createElement } from "react";

const positionSchema = z.object({
  produktId: z.string().min(1),
  packungen: z.coerce.number().int().min(1),
});

const createSchema = z.object({
  kundeId: z.string().min(1),
  datum: z.string().min(1),
  mhd: z.string().min(1),
  bemerkung: z.string().optional().nullable(),
  unterschrift: z.string().min(20),
  positionen: z.array(positionSchema).min(1),
});

export async function createLieferschein(_: unknown, form: FormData) {
  const user = await requireUser();

  const positionsJson = String(form.get("positionen") ?? "[]");
  let positions: unknown;
  try {
    positions = JSON.parse(positionsJson);
  } catch {
    return { ok: false as const, error: "Positionen ungültig." };
  }

  const parsed = createSchema.safeParse({
    kundeId: form.get("kundeId"),
    datum: form.get("datum"),
    mhd: form.get("mhd"),
    bemerkung: form.get("bemerkung") || null,
    unterschrift: form.get("unterschrift"),
    positionen: positions,
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0].message };
  }

  const datum = new Date(parsed.data.datum + "T00:00:00Z");
  const mhd = new Date(parsed.data.mhd + "T00:00:00Z");
  if (Number.isNaN(datum.getTime()) || Number.isNaN(mhd.getTime())) {
    return { ok: false as const, error: "Ungültiges Datum." };
  }

  const produkte = await prisma.produkt.findMany({
    where: { id: { in: parsed.data.positionen.map((p) => p.produktId) } },
  });
  const produktMap = new Map(produkte.map((p) => [p.id, p]));

  const sonder = await prisma.kundeProduktPreis.findMany({
    where: { kundeId: parsed.data.kundeId, produktId: { in: parsed.data.positionen.map((p) => p.produktId) } },
  });
  const sonderMap = new Map(sonder.map((s) => [s.produktId, s.sonderpreis]));

  const positionsData = parsed.data.positionen.map((p, idx) => {
    const produkt = produktMap.get(p.produktId);
    if (!produkt) throw new Error(`Produkt ${p.produktId} fehlt.`);
    const preis = sonderMap.get(p.produktId) ?? produkt.standardpreis;
    return {
      produktId: p.produktId,
      packungen: p.packungen,
      preis,
      reihenfolge: idx,
    };
  });

  const year = datum.getUTCFullYear();
  const nummer = await nextLieferscheinNummer(year);

  const lieferschein = await prisma.lieferschein.create({
    data: {
      nummer,
      kundeId: parsed.data.kundeId,
      fahrerId: user.id,
      datum,
      mhd,
      status: "Unterschrieben",
      unterschrift: parsed.data.unterschrift,
      bemerkung: parsed.data.bemerkung ?? null,
      positionen: { create: positionsData },
    },
    include: {
      kunde: true,
      positionen: { include: { produkt: true } },
    },
  });
  await logLieferscheinStatus(prisma, lieferschein.id, null, "Unterschrieben", user.id, "Erstellt + unterschrieben");

  const settings = await prisma.einstellungen.findUnique({ where: { id: "singleton" } });
  // In production we only send when the Kunde has an e-mail. In dev we ALWAYS
  // route to Mailpit (using a dev-fallback recipient if no Kunde e-mail is set)
  // so the driver flow is testable end-to-end without first editing customers.
  const isDev = process.env.NODE_ENV !== "production";
  const recipient =
    lieferschein.kunde.email ||
    (isDev ? "no-customer-email@dev.eierhof-lafferde.de" : null);

  if (settings && recipient) {
    try {
      const logoBase64 = await getLogoBase64();
      const doc = createElement(LieferscheinDocument, {
        nummer: lieferschein.nummer,
        datum: lieferschein.datum,
        mhd: lieferschein.mhd,
        bemerkung: lieferschein.bemerkung,
        unterschrift: lieferschein.unterschrift,
        kunde: lieferschein.kunde,
        positionen: lieferschein.positionen.map((p) => ({
          bezeichnung: p.produkt.bezeichnung,
          ean13: p.produkt.ean13,
          packungen: p.packungen,
          packungsgroesse: p.produkt.packungsgroesse,
          packungenProKiste: p.produkt.packungenProKiste,
        })),
        einstellungen: settings,
        logoBase64,
      });
      const buffer = await renderPdfBuffer(doc);
      const subject = `Lieferschein ${lieferschein.nummer} – ${settings.firmenname}`;
      const { html, text } = await renderEmail({
        template: "lieferschein",
        title: subject,
        firm: settings,
        vars: {
          nummer: lieferschein.nummer,
          datum: formatDate(lieferschein.datum),
        },
      });
      await sendMail({
        to: recipient,
        subject,
        html,
        text,
        attachments: [{ filename: `${lieferschein.nummer}.pdf`, content: buffer, contentType: "application/pdf" }],
      });
      // Only flip to Versendet when a real customer received it. Dev-fallback
      // routing keeps status at Unterschrieben so the admin still sees it as
      // "needs to actually be sent" once a Kunde e-mail is filled in.
      if (lieferschein.kunde.email) {
        await prisma.lieferschein.update({
          where: { id: lieferschein.id },
          data: { status: "Versendet" },
        });
        await logLieferscheinStatus(
          prisma,
          lieferschein.id,
          "Unterschrieben",
          "Versendet",
          user.id,
          `E-Mail an ${recipient}`
        );
      }
    } catch (err) {
      console.error("Lieferschein E-Mail fehlgeschlagen:", err);
    }
  }

  revalidatePath("/lieferscheine");
  redirect(`/lieferscheine/${lieferschein.id}`);
}

export async function resendLieferschein(id: string) {
  const user = await requireUser();
  const lieferschein = await prisma.lieferschein.findUnique({
    where: { id },
    include: { kunde: true, positionen: { include: { produkt: true } } },
  });
  if (!lieferschein) return { ok: false as const, error: "Nicht gefunden." };
  if (user.role !== "ADMIN" && lieferschein.fahrerId !== user.id) {
    return { ok: false as const, error: "Keine Berechtigung." };
  }
  if (!lieferschein.kunde.email) return { ok: false as const, error: "Keine E-Mail beim Kunden hinterlegt." };

  const settings = await prisma.einstellungen.findUnique({ where: { id: "singleton" } });
  if (!settings) return { ok: false as const, error: "Einstellungen fehlen." };

  const logoBase64 = await getLogoBase64();
  const doc = createElement(LieferscheinDocument, {
    nummer: lieferschein.nummer,
    datum: lieferschein.datum,
    mhd: lieferschein.mhd,
    bemerkung: lieferschein.bemerkung,
    unterschrift: lieferschein.unterschrift,
    kunde: lieferschein.kunde,
    positionen: lieferschein.positionen.map((p) => ({
      bezeichnung: p.produkt.bezeichnung,
      ean13: p.produkt.ean13,
      packungen: p.packungen,
      packungsgroesse: p.produkt.packungsgroesse,
      packungenProKiste: p.produkt.packungenProKiste,
    })),
    einstellungen: settings,
    logoBase64,
  });
  const buffer = await renderPdfBuffer(doc);
  const subject = `Lieferschein ${lieferschein.nummer} – ${settings.firmenname}`;
  const { html, text } = await renderEmail({
    template: "lieferschein",
    title: subject,
    firm: settings,
    vars: {
      nummer: lieferschein.nummer,
      datum: formatDate(lieferschein.datum),
    },
  });
  await sendMail({
    to: lieferschein.kunde.email,
    subject,
    html,
    text,
    attachments: [{ filename: `${lieferschein.nummer}.pdf`, content: buffer, contentType: "application/pdf" }],
  });
  const previousStatus = lieferschein.status;
  await prisma.lieferschein.update({ where: { id }, data: { status: "Versendet" } });
  await logLieferscheinStatus(
    prisma,
    id,
    previousStatus,
    "Versendet",
    user.id,
    `Erneut gesendet an ${lieferschein.kunde.email}`
  );
  revalidatePath(`/lieferscheine/${id}`);
  return { ok: true as const };
}

// helpers shared with form
export type PreisResolved = { produktId: string; preis: Prisma.Decimal };

export async function _adminOnly() {
  await requireAdmin();
}
