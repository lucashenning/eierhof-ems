import fs from "fs/promises";
import path from "path";

export async function storeRechnungPdf(nummer: string, bytes: Buffer): Promise<string> {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (blobToken) {
    const { put } = await import("@vercel/blob");
    const result = await put(`rechnungen/${nummer}.pdf`, bytes, {
      access: "private",
      token: blobToken,
      contentType: "application/pdf",
      addRandomSuffix: false,
    });
    return result.url;
  }

  const dir = path.resolve(process.cwd(), "tmp", "rechnungen");
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${nummer}.pdf`);
  await fs.writeFile(filePath, bytes);
  return `file://${filePath}`;
}

export async function readRechnungPdf(pdfUrl: string): Promise<Buffer> {
  if (pdfUrl.startsWith("file://")) {
    return fs.readFile(pdfUrl.replace("file://", ""));
  }
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) throw new Error("BLOB_READ_WRITE_TOKEN missing — cannot read archived PDF");
  const { get } = await import("@vercel/blob");
  const result = await get(pdfUrl, { access: "private", token: blobToken });
  if (!result || !result.stream) throw new Error(`Archived PDF not found: ${pdfUrl}`);
  return Buffer.from(await new Response(result.stream).arrayBuffer());
}
