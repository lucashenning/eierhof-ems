"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Benutzer = {
  id?: string;
  name?: string;
  email?: string;
  role?: "ADMIN" | "FAHRER";
  aktiv?: boolean;
};

type ActionResult = { ok: true } | { ok: false; error: string } | null;
type FormAction = (state: ActionResult, form: FormData) => Promise<ActionResult>;

export function BenutzerForm({
  benutzer,
  action,
  isCreate,
}: {
  benutzer?: Benutzer;
  action: FormAction;
  isCreate: boolean;
}) {
  const [state, run, pending] = useActionState<ActionResult, FormData>(action, null);
  const u = benutzer ?? {};

  return (
    <form action={run} className="space-y-4 max-w-md">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name *</Label>
        <Input id="name" name="name" defaultValue={u.name} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">E-Mail *</Label>
        <Input id="email" name="email" type="email" defaultValue={u.email} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">
          {isCreate ? "Passwort *" : "Passwort (leer = nicht ändern)"}
        </Label>
        <Input id="password" name="password" type="text" required={isCreate} autoComplete="new-password" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="role">Rolle *</Label>
        <select
          id="role"
          name="role"
          defaultValue={u.role ?? "FAHRER"}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="FAHRER">Fahrer</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="aktiv" defaultChecked={u.aktiv ?? true} className="h-4 w-4" />
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
