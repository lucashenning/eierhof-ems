"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const baseSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().transform((v) => v.toLowerCase()),
  role: z.enum(["ADMIN", "FAHRER"]),
  aktiv: z.boolean(),
});

const createSchema = baseSchema.extend({
  password: z.string().min(4),
});

const updateSchema = baseSchema.extend({
  password: z.string().optional(),
});

function readForm(form: FormData) {
  return {
    name: String(form.get("name") ?? ""),
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
    role: (String(form.get("role") ?? "FAHRER")) as "ADMIN" | "FAHRER",
    aktiv: form.get("aktiv") === "on" || form.get("aktiv") === "true",
  };
}

export async function createBenutzer(_: unknown, form: FormData) {
  await requireAdmin();
  const parsed = createSchema.safeParse(readForm(form));
  if (!parsed.success) return { ok: false as const, error: parsed.error.errors[0].message };
  try {
    await prisma.user.create({ data: parsed.data });
  } catch (e) {
    if (e instanceof Error && "code" in e && (e as { code: string }).code === "P2002") {
      return { ok: false as const, error: "E-Mail wird bereits verwendet." };
    }
    throw e;
  }
  revalidatePath("/benutzer");
  redirect("/benutzer");
}

export async function updateBenutzer(id: string, _: unknown, form: FormData) {
  await requireAdmin();
  const data = readForm(form);
  const parsed = updateSchema.safeParse(data);
  if (!parsed.success) return { ok: false as const, error: parsed.error.errors[0].message };
  const update: Record<string, unknown> = {
    name: parsed.data.name,
    email: parsed.data.email,
    role: parsed.data.role,
    aktiv: parsed.data.aktiv,
  };
  if (parsed.data.password && parsed.data.password.length >= 4) {
    update.password = parsed.data.password;
  }
  await prisma.user.update({ where: { id }, data: update });
  revalidatePath("/benutzer");
  return { ok: true as const };
}
