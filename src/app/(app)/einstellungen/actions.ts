"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  firmenname: z.string().min(1),
  adresse: z.string().min(1),
  plz: z.string().min(1),
  ort: z.string().min(1),
  telefon: z.string().min(1),
  email: z.string().email(),
  tagline: z.string().min(1),
  steuernr: z.string().min(1),
  bankname: z.string().min(1),
  iban: z.string().min(1),
  bic: z.string().min(1),
  defaultBemerkung: z.string().min(1),
});

export async function saveEinstellungen(_: unknown, form: FormData) {
  await requireAdmin();
  const obj: Record<string, string> = {};
  form.forEach((v, k) => {
    obj[k] = String(v);
  });
  const parsed = schema.safeParse(obj);
  if (!parsed.success) return { ok: false as const, error: parsed.error.errors[0].message };
  await prisma.einstellungen.update({ where: { id: "singleton" }, data: parsed.data });
  revalidatePath("/einstellungen");
  return { ok: true as const };
}
