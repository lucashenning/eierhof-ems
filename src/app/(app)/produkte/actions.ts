"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseGermanDecimal } from "@/lib/money";

export async function moveProdukt(id: string, direction: "up" | "down") {
  await requireAdmin();
  const all = await prisma.produkt.findMany({
    orderBy: [{ reihenfolge: "asc" }, { bezeichnung: "asc" }],
    select: { id: true, reihenfolge: true },
  });
  const idx = all.findIndex((p) => p.id === id);
  if (idx < 0) return { ok: false as const, error: "Produkt nicht gefunden." };
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= all.length) return { ok: true as const };

  // Renumber the entire list 0..N to recover from any pre-existing duplicates,
  // then swap the two affected positions. This is robust regardless of seed state.
  const ordered = all.map((p, i) => ({ id: p.id, reihenfolge: i }));
  const tmp = ordered[idx].reihenfolge;
  ordered[idx].reihenfolge = ordered[swapWith].reihenfolge;
  ordered[swapWith].reihenfolge = tmp;

  await prisma.$transaction(
    ordered.map((p) =>
      prisma.produkt.update({ where: { id: p.id }, data: { reihenfolge: p.reihenfolge } })
    )
  );
  revalidatePath("/produkte");
  revalidatePath("/lieferscheine/neu");
  return { ok: true as const };
}

const schema = z.object({
  bezeichnung: z.string().min(1),
  ean13: z.string().regex(/^\d{13}$/, "EAN-13 = 13 Ziffern"),
  standardpreis: z.string().min(1),
  mwstSatz: z.string().min(1),
  einheit: z.string().min(1).default("Packung"),
  packungsgroesse: z.coerce.number().int().min(1),
  packungenProKiste: z.coerce.number().int().min(1),
  aktiv: z.boolean(),
});

function readForm(form: FormData) {
  return {
    bezeichnung: String(form.get("bezeichnung") ?? ""),
    ean13: String(form.get("ean13") ?? "").replace(/\s/g, ""),
    standardpreis: String(form.get("standardpreis") ?? ""),
    mwstSatz: String(form.get("mwstSatz") ?? ""),
    einheit: String(form.get("einheit") ?? "Packung"),
    packungsgroesse: form.get("packungsgroesse"),
    packungenProKiste: form.get("packungenProKiste"),
    aktiv: form.get("aktiv") === "on" || form.get("aktiv") === "true",
  };
}

export async function createProdukt(_: unknown, form: FormData) {
  await requireAdmin();
  const parsed = schema.safeParse(readForm(form));
  if (!parsed.success) return { ok: false as const, error: parsed.error.errors[0].message };
  const standard = parseGermanDecimal(parsed.data.standardpreis);
  const mwst = parseGermanDecimal(parsed.data.mwstSatz);
  if (!standard || !mwst) return { ok: false as const, error: "Ungültige Preise / MwSt." };
  try {
    await prisma.produkt.create({
      data: {
        bezeichnung: parsed.data.bezeichnung,
        ean13: parsed.data.ean13,
        standardpreis: standard,
        mwstSatz: mwst,
        einheit: parsed.data.einheit,
        packungsgroesse: parsed.data.packungsgroesse,
        packungenProKiste: parsed.data.packungenProKiste,
        aktiv: parsed.data.aktiv,
      },
    });
  } catch (e) {
    if (e instanceof Error && "code" in e && (e as { code: string }).code === "P2002") {
      return { ok: false as const, error: "EAN-13 existiert bereits." };
    }
    throw e;
  }
  revalidatePath("/produkte");
  redirect("/produkte");
}

export async function updateProdukt(id: string, _: unknown, form: FormData) {
  await requireAdmin();
  const parsed = schema.safeParse(readForm(form));
  if (!parsed.success) return { ok: false as const, error: parsed.error.errors[0].message };
  const standard = parseGermanDecimal(parsed.data.standardpreis);
  const mwst = parseGermanDecimal(parsed.data.mwstSatz);
  if (!standard || !mwst) return { ok: false as const, error: "Ungültige Preise / MwSt." };
  await prisma.produkt.update({
    where: { id },
    data: {
      bezeichnung: parsed.data.bezeichnung,
      ean13: parsed.data.ean13,
      standardpreis: standard,
      mwstSatz: mwst,
      einheit: parsed.data.einheit,
      packungsgroesse: parsed.data.packungsgroesse,
      packungenProKiste: parsed.data.packungenProKiste,
      aktiv: parsed.data.aktiv,
    },
  });
  revalidatePath("/produkte");
  return { ok: true as const };
}
