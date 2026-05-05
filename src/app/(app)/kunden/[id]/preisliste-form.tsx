"use client";

import { useState, useTransition } from "react";
import { savePreisliste } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNum } from "@/lib/money";

type Row = {
  id: string;
  bezeichnung: string;
  ean13: string;
  standardpreis: string;
  sonderpreis: string;
};

export function PreislisteForm({ kundeId, produkte }: { kundeId: string; produkte: Row[] }) {
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await savePreisliste(kundeId, fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Sonderpreise leer lassen, um den Standardpreis zu verwenden. Beträge in € netto.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produkt</TableHead>
            <TableHead className="text-right">Standardpreis</TableHead>
            <TableHead className="w-44">Sonderpreis</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {produkte.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <div className="font-medium">{p.bezeichnung}</div>
                <div className="text-xs text-muted-foreground font-mono">{p.ean13}</div>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatNum(p.standardpreis)} €
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Input
                    name={`preis_${p.id}`}
                    defaultValue={p.sonderpreis}
                    placeholder="—"
                    className="text-right tabular-nums"
                    inputMode="decimal"
                  />
                  <span className="text-sm text-muted-foreground">€</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Speichere …" : "Preisliste speichern"}
        </Button>
        {saved && <span className="text-sm text-emerald-600">Gespeichert.</span>}
      </div>
    </form>
  );
}
