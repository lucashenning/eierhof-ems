import { prisma } from "./db";

export async function nextLieferscheinNummer(year: number): Promise<string> {
  const id = `lieferschein-${year}`;
  const counter = await prisma.counter.upsert({
    where: { id },
    create: { id, value: 1 },
    update: { value: { increment: 1 } },
  });
  const lfd = String(counter.value).padStart(5, "0");
  return `LS${String(year).slice(-2)}${lfd}`;
}

export async function nextRechnungNummer(kuerzel: string, year: number): Promise<string> {
  const id = `rechnung-${year}`;
  const counter = await prisma.counter.upsert({
    where: { id },
    create: { id, value: 1 },
    update: { value: { increment: 1 } },
  });
  const lfd = String(counter.value).padStart(4, "0");
  const k = (kuerzel || "XX").toUpperCase().padEnd(2, "X").slice(0, 2);
  return `${k}${String(year).slice(-2)}${lfd}`;
}
