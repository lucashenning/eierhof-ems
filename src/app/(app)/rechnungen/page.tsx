import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/dates";
import { formatEur } from "@/lib/money";

export default async function RechnungenListPage() {
  await requireAdmin();
  const rechnungen = await prisma.rechnung.findMany({
    include: { kunde: true },
    orderBy: { datum: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Rechnungen</h1>
        <Button asChild>
          <Link href="/rechnungen/neu">
            <Plus /> Neue Rechnung
          </Link>
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nr.</TableHead>
            <TableHead>Datum</TableHead>
            <TableHead>Kunde</TableHead>
            <TableHead>Zeitraum</TableHead>
            <TableHead className="text-right">Brutto</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rechnungen.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono">{r.nummer}</TableCell>
              <TableCell>{formatDate(r.datum)}</TableCell>
              <TableCell className="font-medium">{r.kunde.firmenname}</TableCell>
              <TableCell className="text-sm">
                {formatDate(r.zeitraumVon)} – {formatDate(r.zeitraumBis)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatEur(r.bruttoBetrag)}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    r.status === "Versendet" ? "success" : r.status === "Freigegeben" ? "default" : "outline"
                  }
                >
                  {r.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/rechnungen/${r.id}`}>Öffnen</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {rechnungen.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                Noch keine Rechnungen vorhanden.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
