import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { previousMonthRange, toISODate } from "@/lib/dates";
import { GenerateForm } from "./form";

export default async function NeueRechnungPage() {
  await requireAdmin();
  const kunden = await prisma.kunde.findMany({
    where: { aktiv: true },
    orderBy: { firmenname: "asc" },
    select: { id: true, firmenname: true, gln: true },
  });
  const range = previousMonthRange();

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-semibold">Neue Rechnung erstellen</h1>
      <p className="text-sm text-muted-foreground">
        Wählt einen Kunden und einen Zeitraum. Es werden alle unterschriebenen / versendeten Lieferscheine
        zusammengefasst, die noch keiner Rechnung zugeordnet sind.
      </p>
      <GenerateForm
        kunden={kunden}
        defaultVon={toISODate(range.from)}
        defaultBis={toISODate(range.to)}
      />
    </div>
  );
}
