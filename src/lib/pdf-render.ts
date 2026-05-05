import { renderToBuffer } from "@react-pdf/renderer";
import fs from "fs/promises";
import path from "path";

let cachedLogo: string | null = null;

export async function getLogoBase64(): Promise<string> {
  if (cachedLogo) return cachedLogo;
  const file = await fs.readFile(path.join(process.cwd(), "public", "logo.png"));
  cachedLogo = `data:image/png;base64,${file.toString("base64")}`;
  return cachedLogo;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function renderPdfBuffer(doc: any): Promise<Buffer> {
  return renderToBuffer(doc);
}
