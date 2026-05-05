import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Prisma } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatEur } from "@/lib/money";
import { startOfMonth, endOfMonth, todayBerlin, addDays, formatDate } from "@/lib/dates";
import { MonthChart } from "./month-chart";

const Decimal = Prisma.Decimal;

export default async function DashboardPage() {
  await requireAdmin();

  const today = todayBerlin();
  const yesterday = addDays(today, -1);
  const todayEnd = new Date(today);
  todayEnd.setUTCHours(23, 59, 59, 999);
  const yEnd = new Date(yesterday);
  yEnd.setUTCHours(23, 59, 59, 999);
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const [todayLs, yesterdayLs, monthLs] = await Promise.all([
    prisma.lieferschein.findMany({
      where: { datum: { gte: today, lte: todayEnd } },
      include: { positionen: true, kunde: true },
    }),
    prisma.lieferschein.findMany({
      where: { datum: { gte: yesterday, lte: yEnd } },
      include: { positionen: true },
    }),
    prisma.lieferschein.findMany({
      where: { datum: { gte: monthStart, lte: monthEnd } },
      include: { positionen: { include: { produkt: true } }, kunde: true },
    }),
  ]);

  function umsatz(
    lieferscheine: { positionen: { preis: Prisma.Decimal; packungen: number }[] }[]
  ) {
    return lieferscheine.reduce((sum, l) => {
      return l.positionen.reduce((s, p) => s.plus(new Decimal(p.preis).mul(p.packungen)), sum);
    }, new Decimal(0));
  }

  const todayUms = umsatz(todayLs);
  const yesterdayUms = umsatz(yesterdayLs);
  const monthUms = umsatz(monthLs);

  // by day
  const byDay = new Map<string, Prisma.Decimal>();
  for (let d = new Date(monthStart); d <= today; d = addDays(d, 1)) {
    byDay.set(d.toISOString().slice(0, 10), new Decimal(0));
  }
  for (const l of monthLs) {
    const key = l.datum.toISOString().slice(0, 10);
    const sum = l.positionen.reduce(
      (s, p) => s.plus(new Decimal(p.preis).mul(p.packungen)),
      byDay.get(key) ?? new Decimal(0)
    );
    byDay.set(key, sum);
  }
  const chartData = Array.from(byDay.entries()).map(([k, v]) => ({
    tag: k.slice(8),
    umsatz: Number(v),
  }));

  const byKunde = new Map<string, { name: string; sum: Prisma.Decimal }>();
  for (const l of monthLs) {
    const sum = l.positionen.reduce((s, p) => s.plus(new Decimal(p.preis).mul(p.packungen)), new Decimal(0));
    const cur = byKunde.get(l.kundeId) ?? { name: l.kunde.firmenname, sum: new Decimal(0) };
    cur.sum = cur.sum.plus(sum);
    byKunde.set(l.kundeId, cur);
  }
  const topKunden = Array.from(byKunde.values()).sort((a, b) => Number(b.sum) - Number(a.sum)).slice(0, 5);

  const byProdukt = new Map<string, { name: string; packungen: number }>();
  for (const l of monthLs) {
    for (const p of l.positionen) {
      const cur = byProdukt.get(p.produktId) ?? { name: p.produkt.bezeichnung, packungen: 0 };
      cur.packungen += p.packungen;
      byProdukt.set(p.produktId, cur);
    }
  }
  const topProdukte = Array.from(byProdukt.values()).sort((a, b) => b.packungen - a.packungen).slice(0, 8);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Tagesumsatz heute</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">{formatEur(todayUms)}</div>
            <div className="text-xs text-muted-foreground mt-1">Gestern: {formatEur(yesterdayUms)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Monatsumsatz {formatDate(monthStart).slice(3)}</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">{formatEur(monthUms)}</div>
            <div className="text-xs text-muted-foreground mt-1">{monthLs.length} Lieferscheine</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Lieferscheine heute</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">{todayLs.length}</div>
            <div className="text-xs text-muted-foreground mt-1">{new Set(todayLs.map(l => l.kundeId)).size} Kunden</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Monatsumsatz nach Tag</CardTitle></CardHeader>
        <CardContent>
          <MonthChart data={chartData} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Top-Kunden (Monat)</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kunde</TableHead>
                  <TableHead className="text-right">Umsatz</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topKunden.map((k, i) => (
                  <TableRow key={i}>
                    <TableCell>{k.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatEur(k.sum)}</TableCell>
                  </TableRow>
                ))}
                {topKunden.length === 0 && (
                  <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">Noch keine Daten.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Produkte (Monat)</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produkt</TableHead>
                  <TableHead className="text-right">Packungen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProdukte.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.packungen}</TableCell>
                  </TableRow>
                ))}
                {topProdukte.length === 0 && (
                  <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">Noch keine Daten.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
