"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { saveEinstellungen } from "./actions";

type Settings = {
  firmenname: string;
  adresse: string;
  plz: string;
  ort: string;
  telefon: string;
  email: string;
  tagline: string;
  steuernr: string;
  bankname: string;
  iban: string;
  bic: string;
  defaultBemerkung: string;
};

export function EinstellungenForm({ settings }: { settings: Settings }) {
  const [state, run, pending] = useActionState(saveEinstellungen, null);

  return (
    <form action={run} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="firmenname">Firmenname</Label>
          <Input id="firmenname" name="firmenname" defaultValue={settings.firmenname} />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="tagline">Tagline</Label>
          <Input id="tagline" name="tagline" defaultValue={settings.tagline} />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="adresse">Adresse</Label>
          <Input id="adresse" name="adresse" defaultValue={settings.adresse} />
        </div>
        <div>
          <Label htmlFor="plz">PLZ</Label>
          <Input id="plz" name="plz" defaultValue={settings.plz} />
        </div>
        <div>
          <Label htmlFor="ort">Ort</Label>
          <Input id="ort" name="ort" defaultValue={settings.ort} />
        </div>
        <div>
          <Label htmlFor="telefon">Telefon</Label>
          <Input id="telefon" name="telefon" defaultValue={settings.telefon} />
        </div>
        <div>
          <Label htmlFor="email">E-Mail</Label>
          <Input id="email" name="email" type="email" defaultValue={settings.email} />
        </div>
        <div>
          <Label htmlFor="steuernr">Steuernr.</Label>
          <Input id="steuernr" name="steuernr" defaultValue={settings.steuernr} />
        </div>
        <div>
          <Label htmlFor="bankname">Bank</Label>
          <Input id="bankname" name="bankname" defaultValue={settings.bankname} />
        </div>
        <div>
          <Label htmlFor="iban">IBAN</Label>
          <Input id="iban" name="iban" defaultValue={settings.iban} />
        </div>
        <div>
          <Label htmlFor="bic">BIC</Label>
          <Input id="bic" name="bic" defaultValue={settings.bic} />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="defaultBemerkung">Standard-Bemerkung Lieferschein</Label>
          <Textarea
            id="defaultBemerkung"
            name="defaultBemerkung"
            defaultValue={settings.defaultBemerkung}
            rows={2}
          />
        </div>
      </div>

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
