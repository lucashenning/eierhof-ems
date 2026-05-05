"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type Kunde = {
  id?: string;
  gln?: string | null;
  kuerzel?: string;
  firmenname?: string;
  addressname?: string | null;
  ansprechpartner?: string | null;
  adresse?: string;
  plz?: string;
  ort?: string;
  emailLieferscheine?: string | null;
  emailRechnungen?: string | null;
  telefon?: string | null;
  filialnummer?: string | null;
  notizen?: string | null;
  aktiv?: boolean;
};

type ActionResult = { ok: true } | { ok: false; error: string } | null;
type FormAction = (state: ActionResult, form: FormData) => Promise<ActionResult>;

export function KundeForm({
  kunde,
  action,
  isCreate = false,
}: {
  kunde?: Kunde;
  action: FormAction;
  isCreate?: boolean;
}) {
  const [state, run, pending] = useActionState<ActionResult, FormData>(action, null);
  const k = kunde ?? {};

  return (
    <form action={run} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          id="gln"
          label="GLN"
          defaultValue={k.gln ?? ""}
          required={isCreate}
          inputMode="numeric"
          help="Eindeutiger Identifier des Kunden (Global Location Number)."
        />
        <Field id="kuerzel" label="Kürzel (2 Buchstaben)" defaultValue={k.kuerzel} required maxLength={4} />
        <div className="md:col-span-2">
          <Field
            id="firmenname"
            label="Firmenname"
            defaultValue={k.firmenname}
            required
            help="Wird in Listen, Suchfeldern und Dropdowns angezeigt."
          />
        </div>
        <div className="md:col-span-2">
          <Field
            id="addressname"
            label="Name im Adressfeld"
            defaultValue={k.addressname ?? ""}
            help="Wird auf Lieferschein und Rechnung im Empfänger-Block gedruckt. Leer lassen, um den Firmennamen zu verwenden."
          />
        </div>
        <Field id="ansprechpartner" label="Ansprechpartner" defaultValue={k.ansprechpartner ?? ""} />
        <Field id="telefon" label="Telefon" defaultValue={k.telefon ?? ""} />
        <Field
          id="emailLieferscheine"
          label="E-Mail Lieferscheine"
          type="email"
          defaultValue={k.emailLieferscheine ?? ""}
          help="Lieferscheine werden an diese Adresse gesendet."
        />
        <Field
          id="emailRechnungen"
          label="E-Mail Rechnungen"
          type="email"
          defaultValue={k.emailRechnungen ?? ""}
          help="Rechnungen werden an diese Adresse gesendet."
        />
        <Field id="filialnummer" label="Filialnummer" defaultValue={k.filialnummer ?? ""} />
        <div className="md:col-span-2">
          <Field id="adresse" label="Adresse" defaultValue={k.adresse} required />
        </div>
        <Field id="plz" label="PLZ" defaultValue={k.plz} required />
        <Field id="ort" label="Ort" defaultValue={k.ort} required />
        <div className="md:col-span-2">
          <Label htmlFor="notizen">Notizen</Label>
          <Textarea id="notizen" name="notizen" defaultValue={k.notizen ?? ""} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="aktiv"
          defaultChecked={k.aktiv ?? true}
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

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Speichere …" : "Speichern"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  required,
  type = "text",
  defaultValue,
  maxLength,
  inputMode,
  help,
}: {
  id: string;
  label: string;
  required?: boolean;
  type?: string;
  defaultValue?: string;
  maxLength?: number;
  inputMode?: "numeric" | "decimal" | "text";
  help?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}{required && " *"}</Label>
      <Input
        id={id}
        name={id}
        type={type}
        defaultValue={defaultValue}
        required={required}
        maxLength={maxLength}
        inputMode={inputMode}
      />
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}
