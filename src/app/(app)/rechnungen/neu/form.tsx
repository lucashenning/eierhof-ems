"use client";

import { useActionState, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/date-input";
import { generateRechnung } from "../actions";

type Kunde = { id: string; firmenname: string; gln: string | null };

export function GenerateForm({
  kunden,
  defaultVon,
  defaultBis,
}: {
  kunden: Kunde[];
  defaultVon: string;
  defaultBis: string;
}) {
  const [state, action, pending] = useActionState(generateRechnung, null);
  const [von, setVon] = useState(defaultVon);
  const [bis, setBis] = useState(defaultBis);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="kundeId">Kunde *</Label>
        <select
          id="kundeId"
          name="kundeId"
          required
          defaultValue=""
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="" disabled>Kunde wählen …</option>
          {kunden.map((k) => (
            <option key={k.id} value={k.id}>
              {k.firmenname}
              {k.gln ? ` (GLN ${k.gln})` : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="von">Von *</Label>
          <DateInput id="von" value={von} onChange={setVon} required />
          <input type="hidden" name="von" value={von} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bis">Bis *</Label>
          <DateInput id="bis" value={bis} onChange={setBis} required />
          <input type="hidden" name="bis" value={bis} />
        </div>
      </div>

      {state && state.ok === false && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Erstelle …" : "Rechnung erstellen"}
      </Button>
    </form>
  );
}
