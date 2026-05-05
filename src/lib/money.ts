import { Prisma } from "@prisma/client";

const Decimal = Prisma.Decimal;
export type DecimalLike = Prisma.Decimal | string | number;

const eurFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function toDecimal(value: DecimalLike): Prisma.Decimal {
  return new Decimal(value);
}

export function formatEur(value: DecimalLike): string {
  return eurFormatter.format(Number(toDecimal(value)));
}

export function formatNum(value: DecimalLike): string {
  return numberFormatter.format(Number(toDecimal(value)));
}

export function multiply(a: DecimalLike, b: DecimalLike): Prisma.Decimal {
  return toDecimal(a).mul(toDecimal(b));
}

export function add(a: DecimalLike, b: DecimalLike): Prisma.Decimal {
  return toDecimal(a).plus(toDecimal(b));
}

/**
 * Parse a price string. Accepts both German ("8,95", "1.234,56") and
 * dot-decimal ("8.95", "1234.56") notation, since users on iPad keyboards
 * often type '.' even in a German UI.
 *
 * Rule of thumb:
 *   - If both '.' and ',' appear, the LAST one is the decimal mark.
 *   - If only '.' appears AND it's followed by exactly 1–2 digits, it's a
 *     decimal mark (e.g. "8.95"). Otherwise it's a thousands separator.
 *   - If only ',' appears, it's the decimal mark (German default).
 */
export function parseGermanDecimal(input: string): Prisma.Decimal | null {
  if (!input) return null;
  const s = input.trim();
  if (!s) return null;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  let normalized: string;
  if (hasComma && hasDot) {
    // last one wins as decimal mark, the other is grouping → drop it
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    if (lastComma > lastDot) {
      normalized = s.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    normalized = s.replace(",", ".");
  } else if (hasDot) {
    // Treat single "." as decimal mark (e.g. "8.95"). If users type
    // "1.234" without a comma (rare), they get 1.234 which is fine math-wise.
    normalized = s;
  } else {
    normalized = s;
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  return new Decimal(normalized);
}
