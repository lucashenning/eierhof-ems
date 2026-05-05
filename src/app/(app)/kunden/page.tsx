import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function KundenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; aktiv?: string }>;
}) {
  await requireAdmin();
  const { q = "", aktiv = "1" } = await searchParams;

  const where = {
    aktiv: aktiv === "0" ? false : aktiv === "all" ? undefined : true,
    OR: q
      ? [
          { firmenname: { contains: q, mode: "insensitive" as const } },
          { gln: { contains: q, mode: "insensitive" as const } },
          { ort: { contains: q, mode: "insensitive" as const } },
        ]
      : undefined,
  };

  const kunden = await prisma.kunde.findMany({
    where,
    orderBy: { firmenname: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Kunden</h1>
        <Button asChild>
          <Link href="/kunden/neu">
            <Plus /> Neuer Kunde
          </Link>
        </Button>
      </div>

      <form className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input name="q" defaultValue={q} placeholder="Suche Firma, Nr., Ort …" className="pl-9" />
        </div>
        <Button variant="outline" type="submit">Suchen</Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>GLN</TableHead>
            <TableHead>Kürzel</TableHead>
            <TableHead>Firmenname</TableHead>
            <TableHead>Ort</TableHead>
            <TableHead>E-Mail</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {kunden.map((k) => (
            <TableRow key={k.id}>
              <TableCell className="font-mono text-xs">
                {k.gln ?? <span className="text-muted-foreground italic">—</span>}
              </TableCell>
              <TableCell className="font-mono">{k.kuerzel}</TableCell>
              <TableCell>
                <Link href={`/kunden/${k.id}`} className="hover:underline font-medium">
                  {k.firmenname}
                </Link>
                {!k.aktiv && (
                  <Badge variant="secondary" className="ml-2">
                    inaktiv
                  </Badge>
                )}
              </TableCell>
              <TableCell>{k.plz} {k.ort}</TableCell>
              <TableCell className="text-xs">
                {k.emailLieferscheine && (
                  <div>
                    <span className="text-muted-foreground">LS:</span> {k.emailLieferscheine}
                  </div>
                )}
                {k.emailRechnungen && (
                  <div>
                    <span className="text-muted-foreground">RG:</span> {k.emailRechnungen}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/kunden/${k.id}`}>Bearbeiten</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {kunden.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                Keine Kunden gefunden.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
