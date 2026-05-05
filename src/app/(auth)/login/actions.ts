"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { login } from "@/lib/auth";

const schema = z.object({
  email: z.string().email("Ungültige E-Mail"),
  password: z.string().min(1, "Passwort fehlt"),
});

export async function loginAction(_: unknown, formData: FormData) {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0].message };
  }
  const user = await login(parsed.data.email, parsed.data.password);
  if (!user) {
    return { ok: false as const, error: "E-Mail oder Passwort falsch" };
  }
  redirect(user.role === "ADMIN" ? "/dashboard" : "/lieferscheine");
}
