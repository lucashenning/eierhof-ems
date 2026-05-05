import { requireAdmin } from "@/lib/auth";
import { ProduktForm } from "../produkt-form";
import { createProdukt } from "../actions";

export default async function NeuesProduktPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Neues Produkt</h1>
      <ProduktForm action={createProdukt} />
    </div>
  );
}
