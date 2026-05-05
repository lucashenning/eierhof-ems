"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus } from "lucide-react";
import { SignaturePad } from "@/components/signature-pad";
import { DateInput } from "@/components/date-input";
import { createLieferschein } from "../actions";
import { addDays, toISODate } from "@/lib/dates";

type Kunde = { id: string; gln: string | null; firmenname: string; ort: string; email: string | null };
type Produkt = {
  id: string;
  bezeichnung: string;
  ean13: string;
  packungsgroesse: number;
  packungenProKiste: number;
};

type Position = {
  produktId: string;
  packungen: number;
};

export function LieferscheinForm({
  kunden,
  produkte,
  defaultDatum,
  defaultMhd,
}: {
  kunden: Kunde[];
  produkte: Produkt[];
  defaultDatum: string;
  defaultMhd: string;
}) {
  const [kundeQuery, setKundeQuery] = useState("");
  const [kundeId, setKundeId] = useState<string | null>(null);
  const [datum, setDatum] = useState(defaultDatum);
  const [mhd, setMhd] = useState(defaultMhd);
  const [bemerkung, setBemerkung] = useState("");
  const [positions, setPositions] = useState<Position[]>([]);
  const [unterschrift, setUnterschrift] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const produktMap = useMemo(() => new Map(produkte.map((p) => [p.id, p])), [produkte]);

  const filteredKunden = useMemo(() => {
    const q = kundeQuery.trim().toLowerCase();
    if (!q) return kunden.slice(0, 10);
    return kunden
      .filter(
        (k) =>
          k.firmenname.toLowerCase().includes(q) ||
          (k.gln ?? "").toLowerCase().includes(q) ||
          k.ort.toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [kundeQuery, kunden]);

  const selectedKunde = kundeId ? kunden.find((k) => k.id === kundeId) : null;

  function addPosition() {
    setPositions((p) => [...p, { produktId: produkte[0]?.id ?? "", packungen: 0 }]);
  }
  function updatePosition(idx: number, patch: Partial<Position>) {
    setPositions((p) => p.map((pos, i) => (i === idx ? { ...pos, ...patch } : pos)));
  }
  function removePosition(idx: number) {
    setPositions((p) => p.filter((_, i) => i !== idx));
  }

  function syncMhdFromDatum(d: string) {
    setDatum(d);
    try {
      const dt = new Date(d + "T00:00:00Z");
      if (!isNaN(dt.getTime())) {
        setMhd(toISODate(addDays(dt, 25)));
      }
    } catch {}
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!kundeId) return setError("Bitte Kunden wählen.");
    if (positions.length === 0) return setError("Mindestens eine Position erforderlich.");
    for (const p of positions) {
      if (!p.produktId) return setError("Jede Position braucht ein Produkt.");
      if (!p.packungen || p.packungen < 1) return setError("Packungen müssen ≥ 1 sein.");
    }
    if (!unterschrift) return setError("Bitte unterschreiben lassen.");

    const fd = new FormData();
    fd.set("kundeId", kundeId);
    fd.set("datum", datum);
    fd.set("mhd", mhd);
    fd.set("bemerkung", bemerkung);
    fd.set("unterschrift", unterschrift);
    fd.set("positionen", JSON.stringify(positions));

    startTransition(async () => {
      const result = await createLieferschein(null, fd);
      if (result && "ok" in result && result.ok === false) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6 max-w-3xl">
      <section className="space-y-2">
        <Label>Kunde *</Label>
        {selectedKunde ? (
          <div className="flex items-center justify-between border rounded-md p-3 bg-muted/30 gap-4">
            <div className="min-w-0">
              <div className="font-medium truncate">{selectedKunde.firmenname}</div>
              <div className="text-sm text-muted-foreground truncate">
                {selectedKunde.gln ? `GLN ${selectedKunde.gln} · ` : ""}
                {selectedKunde.ort}
              </div>
              <div className="text-xs mt-1">
                {selectedKunde.email ? (
                  <span className="text-emerald-700">
                    PDF wird per E-Mail an <span className="font-medium">{selectedKunde.email}</span> gesendet
                  </span>
                ) : (
                  <span className="text-amber-700">
                    Keine E-Mail beim Kunden hinterlegt — PDF nur als Datei verfügbar
                  </span>
                )}
              </div>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setKundeId(null)}>
              Ändern
            </Button>
          </div>
        ) : (
          <>
            <Input
              placeholder="Kunde suchen (Firma, Nr., Ort) …"
              value={kundeQuery}
              onChange={(e) => setKundeQuery(e.target.value)}
              autoFocus
            />
            <div className="border rounded-md divide-y max-h-72 overflow-auto">
              {filteredKunden.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  className="w-full text-left p-3 hover:bg-accent"
                  onClick={() => setKundeId(k.id)}
                >
                  <div className="font-medium">{k.firmenname}</div>
                  <div className="text-sm text-muted-foreground">
                    {k.gln ? `GLN ${k.gln} · ` : ""}
                    {k.ort}
                  </div>
                </button>
              ))}
              {filteredKunden.length === 0 && (
                <div className="p-3 text-sm text-muted-foreground">Keine Treffer.</div>
              )}
            </div>
          </>
        )}
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="datum">Datum *</Label>
          <DateInput id="datum" value={datum} onChange={syncMhdFromDatum} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mhd">MHD *</Label>
          <DateInput id="mhd" value={mhd} onChange={setMhd} required />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Positionen</Label>
          <Button type="button" variant="outline" size="sm" onClick={addPosition}>
            <Plus /> Position
          </Button>
        </div>
        {positions.length === 0 && (
          <p className="text-sm text-muted-foreground border rounded-md p-3">
            Noch keine Positionen. „Position“ klicken, um Produkte hinzuzufügen.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Tipp: Packungen <em>oder</em> Kisten eingeben — das jeweils andere Feld wird automatisch berechnet.
        </p>
        <div className="space-y-2">
          {positions.map((p, idx) => {
            const produkt = produktMap.get(p.produktId);
            const packsPerKiste = Math.max(1, produkt?.packungenProKiste ?? 1);
            const packsize = produkt?.packungsgroesse ?? 1;
            const packungen = p.packungen;
            const kisten = packungen > 0 ? Math.ceil(packungen / packsPerKiste) : 0;
            const stueck = packungen * packsize;
            return (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end border rounded-md p-3">
                <div className="col-span-12 md:col-span-6 space-y-1">
                  <Label className="text-xs">Produkt</Label>
                  <select
                    value={p.produktId}
                    onChange={(e) => updatePosition(idx, { produktId: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {produkte.map((pr) => (
                      <option key={pr.id} value={pr.id}>
                        {pr.bezeichnung}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-4 md:col-span-2 space-y-1">
                  <Label className="text-xs">Packungen</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="–"
                    value={packungen === 0 ? "" : String(packungen)}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      updatePosition(idx, { packungen: digits === "" ? 0 : Number(digits) });
                    }}
                  />
                </div>
                <div className="col-span-3 md:col-span-1 space-y-1">
                  <Label className="text-xs">Kisten</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="–"
                    value={kisten === 0 ? "" : String(kisten)}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      const k = digits === "" ? 0 : Number(digits);
                      // Editing Kisten sets Packungen to a whole multiple of Packungen/Kiste.
                      updatePosition(idx, { packungen: k * packsPerKiste });
                    }}
                  />
                </div>
                <div className="col-span-3 md:col-span-2 space-y-1">
                  <Label className="text-xs">Stück</Label>
                  <Input
                    value={stueck === 0 ? "" : String(stueck)}
                    placeholder="–"
                    readOnly
                    className="bg-muted/40"
                  />
                </div>
                <div className="col-span-2 md:col-span-1 flex justify-end">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removePosition(idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-1.5">
        <Label htmlFor="bemerkung">Bemerkung</Label>
        <Textarea
          id="bemerkung"
          rows={2}
          value={bemerkung}
          onChange={(e) => setBemerkung(e.target.value)}
        />
      </section>

      <section className="space-y-2">
        <Label>Unterschrift Kunde *</Label>
        <SignaturePad value={unterschrift} onChange={setUnterschrift} />
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Speichere …" : "Lieferschein speichern & senden"}
        </Button>
      </div>
    </form>
  );
}
