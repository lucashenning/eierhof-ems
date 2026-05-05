import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Download, Eye, Send } from "lucide-react";
import { requireUser } from "@/lib/auth";
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
import { formatNum } from "@/lib/money";
import { resendLieferschein } from "../actions";
import { StatusLogList } from "@/components/status-log";

export default async function LieferscheinDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const lieferschein = await prisma.lieferschein.findUnique({
    where: { id },
    include: {
      kunde: true,
      fahrer: { select: { name: true } },
      positionen: { include: { produkt: true }, orderBy: { reihenfolge: "asc" } },
      statusLogs: { include: { user: { select: { name: true } } } },
    },
  });
  if (!lieferschein) notFound();
  if (user.role !== "ADMIN" && lieferschein.fahrerId !== user.id) {
    redirect("/lieferscheine");
  }

  async function resendAction() {
    "use server";
    await resendLieferschein(id);
  }

  const isAdmin = user.role === "ADMIN";

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Lieferschein {lieferschein.nummer}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {formatDate(lieferschein.datum)} · {lieferschein.fahrer.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={lieferschein.status === "Versendet" ? "success" : "warning"}>
            {lieferschein.status}
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <a href={`/pdf/lieferschein/${id}`} target="_blank" rel="noopener">
            <Eye /> PDF anzeigen
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href={`/pdf/lieferschein/${id}?download=1`}>
            <Download /> PDF herunterladen
          </a>
        </Button>
        {lieferschein.kunde.emailLieferscheine && (
          <form action={resendAction}>
            <Button type="submit" variant="outline">
              <Send /> Erneut senden
            </Button>
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Empfänger</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-0.5">
            <div className="font-medium">{lieferschein.kunde.firmenname}</div>
            {lieferschein.kunde.ansprechpartner && <div>{lieferschein.kunde.ansprechpartner}</div>}
            <div>{lieferschein.kunde.adresse}</div>
            <div>{lieferschein.kunde.plz} {lieferschein.kunde.ort}</div>
            {lieferschein.kunde.emailLieferscheine && <div className="text-muted-foreground">{lieferschein.kunde.emailLieferscheine}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Daten</CardTitle></CardHeader>
          <CardContent className="text-sm grid grid-cols-2 gap-y-1 gap-x-3">
            <div className="text-muted-foreground">Datum</div><div>{formatDate(lieferschein.datum)}</div>
            <div className="text-muted-foreground">MHD</div><div>{formatDate(lieferschein.mhd)}</div>
            <div className="text-muted-foreground">Fahrer</div><div>{lieferschein.fahrer.name}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Positionen</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produkt</TableHead>
                <TableHead className="text-right">Pack.</TableHead>
                <TableHead className="text-right">Kisten</TableHead>
                <TableHead className="text-right">Stück</TableHead>
                {isAdmin && <TableHead className="text-right">Preis</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lieferschein.positionen.map((p) => {
                const kisten = Math.ceil(p.packungen / Math.max(1, p.produkt.packungenProKiste));
                const stueck = p.packungen * p.produkt.packungsgroesse;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div>{p.produkt.bezeichnung}</div>
                      <div className="text-xs font-mono text-muted-foreground">{p.produkt.ean13}</div>
                    </TableCell>
                    <TableCell className="text-right">{p.packungen}</TableCell>
                    <TableCell className="text-right">{kisten}</TableCell>
                    <TableCell className="text-right">{stueck}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right tabular-nums">
                        {formatNum(p.preis)} €
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {lieferschein.bemerkung && (
        <Card>
          <CardHeader><CardTitle>Bemerkung</CardTitle></CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{lieferschein.bemerkung}</CardContent>
        </Card>
      )}

      {isAdmin && lieferschein.unterschrift && (
        <Card>
          <CardHeader><CardTitle>Unterschrift</CardTitle></CardHeader>
          <CardContent>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lieferschein.unterschrift} alt="Unterschrift" className="max-h-32" />
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card>
          <CardHeader><CardTitle>Status-Verlauf</CardTitle></CardHeader>
          <CardContent>
            <StatusLogList entries={lieferschein.statusLogs} />
          </CardContent>
        </Card>
      )}

      <Button asChild variant="outline">
        <Link href="/lieferscheine">Zurück zur Liste</Link>
      </Button>
    </div>
  );
}
