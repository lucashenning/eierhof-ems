import { notFound } from "next/navigation";
import Link from "next/link";
import { Download, Eye, Send, CheckCircle2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/dates";
import { formatEur, formatNum } from "@/lib/money";
import { aggregateLieferscheine } from "../render";
import { freigebenRechnung, sendRechnung } from "../actions";
import { StatusLogList } from "@/components/status-log";

export default async function RechnungDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const rechnung = await prisma.rechnung.findUnique({
    where: { id },
    include: {
      kunde: true,
      lieferscheine: {
        include: { positionen: { include: { produkt: true } } },
        orderBy: { datum: "asc" },
      },
      statusLogs: { include: { user: { select: { name: true } } } },
    },
  });
  if (!rechnung) notFound();

  const agg = aggregateLieferscheine(rechnung.lieferscheine);

  async function freigebenAction() {
    "use server";
    await freigebenRechnung(id);
  }
  async function sendAction() {
    "use server";
    await sendRechnung(id);
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Rechnung {rechnung.nummer}</h1>
          <p className="text-sm text-muted-foreground">
            {rechnung.kunde.firmenname} · {formatDate(rechnung.zeitraumVon)} – {formatDate(rechnung.zeitraumBis)}
          </p>
        </div>
        <Badge
          variant={
            rechnung.status === "Versendet"
              ? "success"
              : rechnung.status === "Freigegeben"
              ? "default"
              : "outline"
          }
        >
          {rechnung.status}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <a href={`/pdf/rechnung/${id}`} target="_blank" rel="noopener">
            <Eye /> PDF anzeigen
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href={`/pdf/rechnung/${id}?download=1`}>
            <Download /> PDF herunterladen
          </a>
        </Button>
        {rechnung.status === "Entwurf" && (
          <form action={freigebenAction}>
            <Button type="submit">
              <CheckCircle2 /> Freigeben & Archivieren
            </Button>
          </form>
        )}
        {rechnung.status !== "Entwurf" && rechnung.kunde.emailRechnungen && (
          <form action={sendAction}>
            <Button type="submit" variant="outline">
              <Send /> {rechnung.status === "Versendet" ? "Erneut senden" : "Senden"}
            </Button>
          </form>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>Positionen ({rechnung.lieferscheine.length} Lieferscheine)</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lieferdatum</TableHead>
                <TableHead className="text-right">Menge</TableHead>
                <TableHead>Artikel</TableHead>
                <TableHead className="text-right">Einzel</TableHead>
                <TableHead className="text-right">Gesamt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agg.groups.flatMap((g, gi) =>
                g.positionen.map((p, pi) => (
                  <TableRow key={`${gi}-${pi}`}>
                    <TableCell>{pi === 0 ? formatDate(g.lieferdatum) : ""}</TableCell>
                    <TableCell className="text-right">{p.packungen}</TableCell>
                    <TableCell>
                      <div>{p.bezeichnung}</div>
                      <div className="text-xs text-muted-foreground font-mono">{p.ean13}</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatNum(p.einzelpreis)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNum(p.gesamtpreis)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          <div className="text-sm text-muted-foreground space-y-1">
            <div className="flex justify-between"><span>Eier 10er Packungen</span><span>{agg.zusammenfassung.eier10er}</span></div>
            <div className="flex justify-between"><span>Eier 6er Packungen</span><span>{agg.zusammenfassung.eier6er}</span></div>
            <div className="flex justify-between"><span>Eier 4er Packungen</span><span>{agg.zusammenfassung.eier4er}</span></div>
            <div className="flex justify-between font-medium text-foreground"><span>Summe Eier</span><span>{agg.zusammenfassung.summeEier}</span></div>
          </div>
          <div className="space-y-1 text-base">
            <div className="flex justify-between"><span className="font-semibold">Summe netto</span><span className="font-semibold tabular-nums">{formatEur(agg.netto)}</span></div>
            {Number(agg.mwst7) !== 0 && (
              <div className="flex justify-between"><span>+ MwSt. 7 %</span><span className="tabular-nums">{formatEur(agg.mwst7)}</span></div>
            )}
            {Number(agg.mwst19) !== 0 && (
              <div className="flex justify-between"><span>+ MwSt. 19 %</span><span className="tabular-nums">{formatEur(agg.mwst19)}</span></div>
            )}
            <div className="flex justify-between text-lg pt-1 border-t mt-1"><span>Endbetrag</span><span className="font-bold tabular-nums">{formatEur(agg.brutto)}</span></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Status-Verlauf</CardTitle></CardHeader>
        <CardContent>
          <StatusLogList entries={rechnung.statusLogs} />
        </CardContent>
      </Card>

      <Button asChild variant="outline">
        <Link href="/rechnungen">Zurück zur Liste</Link>
      </Button>
    </div>
  );
}
