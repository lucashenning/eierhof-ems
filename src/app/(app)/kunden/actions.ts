"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseGermanDecimal } from "@/lib/money";

const kundeSchema = z.object({
  // GLN is the unique identifier. Optional in the schema for legacy customers,
  // but the create form requires it (UX layer).
  gln: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  kuerzel: z.string().min(1).max(4).transform((v) => v.toUpperCase()),
  firmenname: z.string().min(1),
  addressname: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  ansprechpartner: z.string().optional().nullable(),
  adresse: z.string().min(1),
  plz: z.string().min(1),
  ort: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")).transform((v) => v || null),
  telefon: z.string().optional().nullable(),
  filialnummer: z.string().optional().nullable(),
  notizen: z.string().optional().nullable(),
  aktiv: z.coerce.boolean().optional().default(true),
});

function readForm(form: FormData) {
  const obj: Record<string, unknown> = {};
  form.forEach((v, k) => {
    obj[k] = typeof v === "string" ? v : "";
  });
  obj.aktiv = form.get("aktiv") === "on" || form.get("aktiv") === "true";
  return obj;
}

export async function createKunde(_: unknown, form: FormData) {
  await requireAdmin();
  const parsed = kundeSchema.safeParse(readForm(form));
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0].message };
  }
  try {
    const kunde = await prisma.kunde.create({ data: parsed.data });
    revalidatePath("/kunden");
    redirect(`/kunden/${kunde.id}`);
  } catch (e) {
    if (e instanceof Error && "code" in e && (e as { code: string }).code === "P2002") {
      return { ok: false as const, error: "GLN existiert bereits." };
    }
    throw e;
  }
}

export async function updateKunde(id: string, _: unknown, form: FormData) {
  await requireAdmin();
  const parsed = kundeSchema.safeParse(readForm(form));
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0].message };
  }
  await prisma.kunde.update({ where: { id }, data: parsed.data });
  revalidatePath("/kunden");
  revalidatePath(`/kunden/${id}`);
  return { ok: true as const };
}

export async function savePreisliste(kundeId: string, form: FormData) {
  await requireAdmin();
  const ops: Promise<unknown>[] = [];
  for (const [key, value] of form.entries()) {
    if (!key.startsWith("preis_")) continue;
    const produktId = key.replace("preis_", "");
    const trimmed = String(value).trim();
    if (!trimmed) {
      ops.push(
        prisma.kundeProduktPreis
          .deleteMany({ where: { kundeId, produktId } })
          .then(() => null)
      );
      continue;
    }
    const dec = parseGermanDecimal(trimmed);
    if (!dec) continue;
    ops.push(
      prisma.kundeProduktPreis.upsert({
        where: { kundeId_produktId: { kundeId, produktId } },
        create: { kundeId, produktId, sonderpreis: dec },
        update: { sonderpreis: dec },
      })
    );
  }
  await Promise.all(ops);
  revalidatePath(`/kunden/${kundeId}`);
  return { ok: true as const };
}
