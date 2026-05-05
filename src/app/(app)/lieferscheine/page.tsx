import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
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
import { formatDate, todayBerlin } from "@/lib/dates";

export default async function LieferscheineListPage() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  const lieferscheine = await prisma.lieferschein.findMany({
    where: isAdmin ? undefined : { fahrerId: user.id },
    include: { kunde: true, fahrer: true, positionen: true },
    orderBy: [{ datum: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  const today = todayBerlin().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Lieferscheine</h1>
        <Button asChild size="lg">
          <Link href="/lieferscheine/neu">
            <Plus /> Neuer Lieferschein
          </Link>
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nr.</TableHead>
            <TableHead>Datum</TableHead>
            <TableHead>Kunde</TableHead>
            {isAdmin && <TableHead>Fahrer</TableHead>}
            <TableHead className="text-right">Positionen</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lieferscheine.map((l) => {
            const isToday = l.datum.toISOString().slice(0, 10) === today;
            return (
              <TableRow key={l.id} className={isToday ? "bg-emerald-50/40" : ""}>
                <TableCell className="font-mono">{l.nummer}</TableCell>
                <TableCell>
                  {formatDate(l.datum)}
                  {isToday && <Badge variant="success" className="ml-2">heute</Badge>}
                </TableCell>
                <TableCell className="font-medium">{l.kunde.firmenname}</TableCell>
                {isAdmin && <TableCell className="text-sm">{l.fahrer.name}</TableCell>}
                <TableCell className="text-right">{l.positionen.length}</TableCell>
                <TableCell>
                  <StatusBadge status={l.status} />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/lieferscheine/${l.id}`}>Öffnen</Link>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
          {lieferscheine.length === 0 && (
            <TableRow>
              <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-8 text-muted-foreground">
                Noch keine Lieferscheine vorhanden.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function StatusBadge({ status }: { status: "Entwurf" | "Unterschrieben" | "Versendet" }) {
  if (status === "Versendet") return <Badge variant="success">Versendet</Badge>;
  if (status === "Unterschrieben") return <Badge variant="warning">Unterschrieben</Badge>;
  return <Badge variant="outline">Entwurf</Badge>;
}
