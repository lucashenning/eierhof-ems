import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KundeForm } from "../kunde-form";
import { updateKunde } from "../actions";
import { PreislisteForm } from "./preisliste-form";

export default async function KundeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const kunde = await prisma.kunde.findUnique({
    where: { id },
    include: { sonderpreise: true },
  });
  if (!kunde) notFound();

  const produkte = await prisma.produkt.findMany({
    where: { aktiv: true },
    orderBy: { bezeichnung: "asc" },
  });

  const updateBound = updateKunde.bind(null, id);
  const sonderMap = new Map(kunde.sonderpreise.map((s) => [s.produktId, s.sonderpreis.toString()]));

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">{kunde.firmenname}</h1>
        <p className="text-sm text-muted-foreground">
          {kunde.gln ? `GLN ${kunde.gln} · ` : ""}Kürzel {kunde.kuerzel}
        </p>
      </div>

      <Tabs defaultValue="stammdaten">
        <TabsList>
          <TabsTrigger value="stammdaten">Stammdaten</TabsTrigger>
          <TabsTrigger value="preisliste">Preisliste</TabsTrigger>
        </TabsList>
        <TabsContent value="stammdaten">
          <KundeForm
            kunde={{
              ...kunde,
              gln: kunde.gln ?? null,
              addressname: kunde.addressname ?? null,
              ansprechpartner: kunde.ansprechpartner ?? null,
              email: kunde.email ?? null,
              telefon: kunde.telefon ?? null,
              filialnummer: kunde.filialnummer ?? null,
              notizen: kunde.notizen ?? null,
            }}
            action={updateBound}
          />
        </TabsContent>
        <TabsContent value="preisliste">
          <PreislisteForm
            kundeId={id}
            produkte={produkte.map((p) => ({
              id: p.id,
              bezeichnung: p.bezeichnung,
              ean13: p.ean13,
              standardpreis: p.standardpreis.toString(),
              sonderpreis: sonderMap.get(p.id) ?? "",
            }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
