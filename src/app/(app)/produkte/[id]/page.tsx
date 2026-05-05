import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ProduktForm } from "../produkt-form";
import { updateProdukt } from "../actions";

export default async function ProduktEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const produkt = await prisma.produkt.findUnique({ where: { id } });
  if (!produkt) notFound();

  const updateBound = updateProdukt.bind(null, id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{produkt.bezeichnung}</h1>
      <ProduktForm
        produkt={{
          id: produkt.id,
          bezeichnung: produkt.bezeichnung,
          ean13: produkt.ean13,
          standardpreis: produkt.standardpreis.toString(),
          mwstSatz: produkt.mwstSatz.toString(),
          einheit: produkt.einheit,
          packungsgroesse: produkt.packungsgroesse,
          packungenProKiste: produkt.packungenProKiste,
          aktiv: produkt.aktiv,
        }}
        action={updateBound}
      />
    </div>
  );
}
