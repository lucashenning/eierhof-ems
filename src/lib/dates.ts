const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Berlin",
});

const dateTimeFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Berlin",
});

export function formatDate(d: Date | string): string {
  return dateFormatter.format(typeof d === "string" ? new Date(d) : d);
}

export function formatDateTime(d: Date | string): string {
  return dateTimeFormatter.format(typeof d === "string" ? new Date(d) : d);
}

export function addDays(date: Date, days: number): Date {
  const out = new Date(date);
  out.setDate(out.getDate() + days);
  return out;
}

export function todayBerlin(): Date {
  const now = new Date();
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return new Date(`${ymd}T00:00:00Z`);
}

export function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function endOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

export function previousMonthRange(now = new Date()): { from: Date; to: Date } {
  const ref = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return { from: startOfMonth(ref), to: endOfMonth(ref) };
}

export function toISODate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
