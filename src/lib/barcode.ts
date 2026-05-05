// jsbarcode's high-level entry point requires a DOM canvas/SVG element to
// render into. We only need the bar pattern as raw binary, so we hit the
// EAN13 encoder class directly — same module the high-level API delegates to.
import EAN13Module from "jsbarcode/bin/barcodes/EAN_UPC/EAN13.js";

type EAN13Class = new (
  data: string,
  options: { flat?: boolean }
) => { valid(): boolean; encode(): { data: string; text: string } };

const EAN13 = ((EAN13Module as unknown as { default?: EAN13Class }).default ??
  (EAN13Module as unknown as EAN13Class)) as EAN13Class;

type BarcodeData = {
  bars: { x: number; width: number }[];
  totalWidth: number;
  text: string;
};

export function ean13Bars(value: string): BarcodeData {
  const ean = new EAN13(value, { flat: true });
  if (!ean.valid()) throw new Error(`Invalid EAN-13: ${value}`);
  const { data: binary, text } = ean.encode();

  const bars: { x: number; width: number }[] = [];
  let i = 0;
  while (i < binary.length) {
    const ch = binary[i];
    let width = 1;
    while (i + width < binary.length && binary[i + width] === ch) width++;
    if (ch === "1") bars.push({ x: i, width });
    i += width;
  }
  return { bars, totalWidth: binary.length, text };
}
