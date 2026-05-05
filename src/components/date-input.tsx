"use client";

import * as React from "react";
import { CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

/**
 * Text input + calendar popover. Always displays DD.MM.JJJJ regardless of OS
 * locale. Internal value is ISO YYYY-MM-DD so it round-trips with Prisma /
 * Server Actions. The calendar popup is always in German (`de` locale).
 */
export function DateInput({
  value,
  onChange,
  id,
  required,
  className,
}: {
  value: string; // ISO YYYY-MM-DD (or empty)
  onChange: (iso: string) => void;
  id?: string;
  required?: boolean;
  className?: string;
}) {
  const [text, setText] = React.useState(isoToGerman(value));
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setText(isoToGerman(value));
  }, [value]);

  function commit(t: string) {
    const iso = germanToIso(t);
    if (iso !== null) onChange(iso);
  }

  const selected = isoToDate(value) ?? undefined;

  return (
    <div className={cn("relative", className)}>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="TT.MM.JJJJ"
        value={text}
        required={required}
        pattern="\d{2}\.\d{2}\.\d{4}"
        maxLength={10}
        className="pr-10"
        onChange={(e) => {
          // Auto-insert dots while typing digits
          const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
          let formatted = digits;
          if (digits.length >= 5) {
            formatted = `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
          } else if (digits.length >= 3) {
            formatted = `${digits.slice(0, 2)}.${digits.slice(2)}`;
          }
          setText(formatted);
          if (formatted.length === 10) commit(formatted);
          else if (formatted.length === 0) onChange("");
        }}
        onBlur={() => commit(text)}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            tabIndex={-1}
            aria-label="Kalender öffnen"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <CalendarDays className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected ?? undefined}
            onSelect={(d) => {
              if (!d) return;
              const iso = dateToIso(d);
              setText(isoToGerman(iso));
              onChange(iso);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function isoToGerman(iso: string): string {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  return `${m[3]}.${m[2]}.${m[1]}`;
}

function germanToIso(text: string): string | null {
  if (!text) return "";
  const m = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 9999) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function isoToDate(iso: string): Date | null {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

function dateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
