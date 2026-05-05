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

export async function nextRechnungNummer(kuerzel: string): Promise<string> {
  const id = "rechnung-global";
  // Counter convention: the row's `value` is the most recently issued lfdNr.
  // First call seeds value=100001 and returns it; subsequent calls increment
  // and return the post-update value. So nextRechnungNummer never returns 100000.
  const counter = await prisma.counter.upsert({
    where: { id },
    create: { id, value: 100001 },
    update: { value: { increment: 1 } },
  });
  const lfd = String(counter.value).padStart(6, "0");
  const k = (kuerzel || "XX").toUpperCase().padEnd(2, "X").slice(0, 2);
  return `EG${k}${lfd}`;
}
