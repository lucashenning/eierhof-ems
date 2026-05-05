import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LieferscheinForm } from "./form";
import { todayBerlin, addDays, toISODate } from "@/lib/dates";

export default async function NeuerLieferscheinPage() {
  await requireUser();

  const [kunden, produkte] = await Promise.all([
    prisma.kunde.findMany({
      where: { aktiv: true },
      orderBy: { firmenname: "asc" },
      select: {
        id: true,
        gln: true,
        firmenname: true,
        ort: true,
        email: true,
      },
    }),
    prisma.produkt.findMany({
      where: { aktiv: true },
      orderBy: [{ reihenfolge: "asc" }, { bezeichnung: "asc" }],
      select: {
        id: true,
        bezeichnung: true,
        ean13: true,
        packungsgroesse: true,
        packungenProKiste: true,
      },
    }),
  ]);

  const today = todayBerlin();
  const datum = toISODate(today);
  const mhd = toISODate(addDays(today, 25));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Neuer Lieferschein</h1>
      <LieferscheinForm kunden={kunden} produkte={produkte} defaultDatum={datum} defaultMhd={mhd} />
    </div>
  );
}
