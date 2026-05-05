import { redirect } from "next/navigation";
import { prisma } from "./db";
import { readSession, setSession, clearSession } from "./session";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "FAHRER";
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const sess = await readSession();
  if (!sess) return null;
  const user = await prisma.user.findUnique({
    where: { id: sess.userId },
    select: { id: true, email: true, name: true, role: true, aktiv: true },
  });
  if (!user || !user.aktiv) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}

export async function login(email: string, password: string): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.aktiv) return null;
  if (user.password !== password) return null;
  await setSession({ userId: user.id, role: user.role });
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function logout() {
  await clearSession();
}
