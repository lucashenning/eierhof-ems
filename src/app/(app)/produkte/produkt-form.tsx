"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Produkt = {
  id?: string;
  bezeichnung?: string;
  ean13?: string;
  standardpreis?: string;
  mwstSatz?: string;
  einheit?: string;
  packungsgroesse?: number;
  packungenProKiste?: number;
  aktiv?: boolean;
};

type ActionResult = { ok: true } | { ok: false; error: string } | null;
type FormAction = (state: ActionResult, form: FormData) => Promise<ActionResult>;

export function ProduktForm({ produkt, action }: { produkt?: Produkt; action: FormAction }) {
  const [state, run, pending] = useActionState<ActionResult, FormData>(action, null);
  const p = produkt ?? {};

  return (
    <form action={run} className="space-y-4 max-w-xl">
      <div className="space-y-1.5">
        <Label htmlFor="bezeichnung">Bezeichnung *</Label>
        <Input id="bezeichnung" name="bezeichnung" defaultValue={p.bezeichnung} required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="ean13">EAN-13 *</Label>
          <Input
            id="ean13"
            name="ean13"
            defaultValue={p.ean13}
            inputMode="numeric"
            pattern="\d{13}"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="einheit">Einheit</Label>
          <Input id="einheit" name="einheit" defaultValue={p.einheit ?? "Packung"} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="standardpreis">Standardpreis (€ netto) *</Label>
          <Input
            id="standardpreis"
            name="standardpreis"
            defaultValue={p.standardpreis}
            inputMode="decimal"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mwstSatz">MwSt-Satz (%) *</Label>
          <Input
            id="mwstSatz"
            name="mwstSatz"
            defaultValue={p.mwstSatz ?? "7"}
            inputMode="decimal"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="packungsgroesse">Packungsgröße (Stück / Pack) *</Label>
          <Input
            id="packungsgroesse"
            name="packungsgroesse"
            defaultValue={p.packungsgroesse ?? 10}
            inputMode="numeric"
            type="number"
            min={1}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="packungenProKiste">Packungen / Kiste *</Label>
          <Input
            id="packungenProKiste"
            name="packungenProKiste"
            defaultValue={p.packungenProKiste ?? 21}
            inputMode="numeric"
            type="number"
            min={1}
            required
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="aktiv"
          defaultChecked={p.aktiv ?? true}
          className="h-4 w-4"
        />
        Aktiv
      </label>

      {state && state.ok === false && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state && state.ok === true && (
        <p className="text-sm text-emerald-600">Gespeichert.</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Speichere …" : "Speichern"}
      </Button>
    </form>
  );
}
