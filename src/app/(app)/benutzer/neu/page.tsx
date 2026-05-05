import { requireAdmin } from "@/lib/auth";
import { BenutzerForm } from "../benutzer-form";
import { createBenutzer } from "../actions";

export default async function NeuerBenutzerPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Neuer Benutzer</h1>
      <BenutzerForm action={createBenutzer} isCreate />
    </div>
  );
}
