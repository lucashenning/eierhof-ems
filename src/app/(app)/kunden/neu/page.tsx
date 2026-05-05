import { requireAdmin } from "@/lib/auth";
import { KundeForm } from "../kunde-form";
import { createKunde } from "../actions";

export default async function NeuerKundePage() {
  await requireAdmin();
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">Neuer Kunde</h1>
      <KundeForm action={createKunde} isCreate />
    </div>
  );
}
