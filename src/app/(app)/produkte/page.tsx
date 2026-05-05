import Link from "next/link";
import { Plus, ArrowUp, ArrowDown } from "lucide-react";
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
import { formatNum } from "@/lib/money";
import { moveProdukt } from "./actions";

export default async function ProdukteListPage() {
  await requireAdmin();
  const produkte = await prisma.produkt.findMany({
    orderBy: [{ reihenfolge: "asc" }, { bezeichnung: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Produkte</h1>
        <Button asChild>
          <Link href="/produkte/neu">
            <Plus /> Neues Produkt
          </Link>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Reihenfolge per Pfeiltasten anpassen — diese Reihenfolge wird im Lieferschein-Dropdown
        verwendet.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Reihenfolge</TableHead>
            <TableHead>Bezeichnung</TableHead>
            <TableHead>EAN-13</TableHead>
            <TableHead className="text-right">Standardpreis</TableHead>
            <TableHead className="text-right">MwSt</TableHead>
            <TableHead>Pack</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {produkte.map((p, i) => {
            const moveUp = async () => {
              "use server";
              await moveProdukt(p.id, "up");
            };
            const moveDown = async () => {
              "use server";
              await moveProdukt(p.id, "down");
            };
            return (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <form action={moveUp}>
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={i === 0}
                        title="Nach oben"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                    </form>
                    <form action={moveDown}>
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={i === produkte.length - 1}
                        title="Nach unten"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  <Link href={`/produkte/${p.id}`} className="hover:underline">
                    {p.bezeichnung}
                  </Link>
                  {!p.aktiv && <Badge variant="secondary" className="ml-2">inaktiv</Badge>}
                </TableCell>
                <TableCell className="font-mono text-sm">{p.ean13}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNum(p.standardpreis)} €</TableCell>
                <TableCell className="text-right tabular-nums">{formatNum(p.mwstSatz)} %</TableCell>
                <TableCell className="text-sm">
                  {p.packungsgroesse} Stück / {p.packungenProKiste} pro Kiste
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/produkte/${p.id}`}>Bearbeiten</Link>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
