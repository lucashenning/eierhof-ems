import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readRechnungPdf } from "@/lib/storage";
import { renderRechnungBuffer } from "@/app/(app)/rechnungen/render";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();
  const { id } = await params;
  const rechnung = await prisma.rechnung.findUnique({
    where: { id },
    include: {
      kunde: true,
      lieferscheine: {
        include: {
          positionen: { include: { produkt: true }, orderBy: { reihenfolge: "asc" } },
        },
        orderBy: { datum: "asc" },
      },
    },
  });
  if (!rechnung) return new Response("Not found", { status: 404 });

  const download = req.nextUrl.searchParams.get("download") === "1";

  if (rechnung.pdfUrl) {
    const buffer = await readRechnungPdf(rechnung.pdfUrl);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${rechnung.nummer}.pdf"`,
      },
    });
  }

  // Entwurf: render on demand
  const buffer = await renderRechnungBuffer(rechnung);
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${rechnung.nummer}.pdf"`,
    },
  });
}
