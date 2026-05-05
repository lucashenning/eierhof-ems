import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EinstellungenForm } from "./form";

export default async function EinstellungenPage() {
  await requireAdmin();
  const settings = await prisma.einstellungen.findUnique({ where: { id: "singleton" } });
  if (!settings) {
    return (
      <p className="text-muted-foreground">
        Einstellungen wurden noch nicht initialisiert. Bitte Seed ausführen.
      </p>
    );
  }
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">Einstellungen</h1>
      <EinstellungenForm settings={settings} />
      <div className="border-t pt-6">
        <h2 className="text-lg font-semibold mb-2">SMTP (read-only)</h2>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Host</dt>
          <dd className="font-mono">{process.env.SMTP_HOST || "—"}</dd>
          <dt className="text-muted-foreground">Port</dt>
          <dd className="font-mono">{process.env.SMTP_PORT || "—"}</dd>
          <dt className="text-muted-foreground">From</dt>
          <dd className="font-mono">{process.env.SMTP_FROM || "—"}</dd>
        </dl>
      </div>
    </div>
  );
}
