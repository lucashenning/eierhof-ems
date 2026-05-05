import { createHmac } from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function makeCookie(userId: string, role: string) {
  const secret = process.env.SESSION_SECRET!;
  const payload = { userId, role, iat: Math.floor(Date.now() / 1000) };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

async function fetchWithCookie(url: string, cookie: string, opts: RequestInit = {}) {
  return fetch(url, {
    ...opts,
    headers: { ...(opts.headers ?? {}), cookie: `eierhof-session=${cookie}` },
    redirect: "manual",
  });
}

async function check(label: string, url: string, cookie: string, expect: { status?: number; contentType?: string }) {
  const res = await fetchWithCookie(url, cookie);
  const ct = res.headers.get("content-type") ?? "";
  const ok =
    (expect.status ? res.status === expect.status : true) &&
    (expect.contentType ? ct.includes(expect.contentType) : true);
  console.log(`${ok ? "✅" : "❌"} ${label} → ${res.status} ${ct}`);
  return res;
}

async function main() {
  const admin = await prisma.user.findUnique({ where: { email: "admin@eierhof-lafferde.de" } });
  const fahrer = await prisma.user.findUnique({ where: { email: "fahrer@eierhof-lafferde.de" } });
  if (!admin || !fahrer) throw new Error("Seed users missing.");

  const adminCookie = makeCookie(admin.id, "ADMIN");
  const fahrerCookie = makeCookie(fahrer.id, "FAHRER");

  const base = "http://localhost:3000";

  for (const path of [
    "/dashboard",
    "/lieferscheine",
    "/rechnungen",
    "/kunden",
    "/produkte",
    "/benutzer",
    "/einstellungen",
  ]) {
    await check(`admin GET ${path}`, base + path, adminCookie, { status: 200, contentType: "text/html" });
  }
  await check("admin GET /lieferscheine/neu", base + "/lieferscheine/neu", adminCookie, {
    status: 200,
    contentType: "text/html",
  });
  await check("admin GET /rechnungen/neu", base + "/rechnungen/neu", adminCookie, {
    status: 200,
    contentType: "text/html",
  });

  // Fahrer should not access admin pages — expect redirect (307) to /
  await check("fahrer GET /dashboard (should redirect)", base + "/dashboard", fahrerCookie, {
    status: 307,
  });
  await check("fahrer GET /kunden (should redirect)", base + "/kunden", fahrerCookie, { status: 307 });
  await check("fahrer GET /lieferscheine", base + "/lieferscheine", fahrerCookie, {
    status: 200,
    contentType: "text/html",
  });

  // Test PDF route
  // First create a Lieferschein with a few positions to render
  const kunde = await prisma.kunde.findFirst({ where: { aktiv: true } });
  const produkt10er = await prisma.produkt.findUnique({ where: { ean13: "4260694670002" } });
  const produkt6er = await prisma.produkt.findUnique({ where: { ean13: "4260694670019" } });
  if (!kunde || !produkt10er || !produkt6er) throw new Error("missing test fixtures");

  const datum = new Date();
  datum.setUTCHours(0, 0, 0, 0);
  const mhd = new Date(datum);
  mhd.setUTCDate(mhd.getUTCDate() + 25);

  const existing = await prisma.lieferschein.findFirst({ where: { kundeId: kunde.id } });
  let testLs = existing;
  if (!testLs) {
    testLs = await prisma.lieferschein.create({
      data: {
        nummer: `LS26TEST1`,
        kundeId: kunde.id,
        fahrerId: fahrer.id,
        datum,
        mhd,
        status: "Unterschrieben",
        unterschrift:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=",
        bemerkung: "Smoke test",
        positionen: {
          create: [
            { produktId: produkt10er.id, packungen: 10, preis: produkt10er.standardpreis, reihenfolge: 0 },
            { produktId: produkt6er.id, packungen: 5, preis: produkt6er.standardpreis, reihenfolge: 1 },
          ],
        },
      },
    });
  }

  const pdfRes = await check(
    "admin GET /pdf/lieferschein/{id}",
    `${base}/pdf/lieferschein/${testLs.id}`,
    adminCookie,
    { status: 200, contentType: "application/pdf" }
  );
  if (pdfRes.status === 200) {
    const bytes = Buffer.from(await pdfRes.arrayBuffer());
    console.log(`   pdf size: ${bytes.length} bytes; magic: ${bytes.slice(0, 5).toString()}`);
  }

  // Generate a Rechnung programmatically (skip the form path)
  // Use existing Lieferscheine for kunde
  const lsForKunde = await prisma.lieferschein.findMany({
    where: { kundeId: kunde.id, rechnungen: { none: {} } },
    include: { positionen: { include: { produkt: true } } },
  });
  if (lsForKunde.length > 0) {
    const datesAll = lsForKunde.map((l) => l.datum);
    const von = new Date(Math.min(...datesAll.map((d) => d.getTime())));
    const bis = new Date(Math.max(...datesAll.map((d) => d.getTime())));
    bis.setUTCHours(23, 59, 59);

    const Decimal = (await import("@prisma/client")).Prisma.Decimal;
    const netto = lsForKunde.reduce(
      (s, l) =>
        l.positionen.reduce(
          (s2, p) => s2.plus(new Decimal(p.preis).mul(p.packungen)),
          s
        ),
      new Decimal(0)
    );
    const r =
      (await prisma.rechnung.findFirst({ where: { kundeId: kunde.id } })) ??
      (await prisma.rechnung.create({
        data: {
          nummer: `EG${kunde.kuerzel}999999`,
          kundeId: kunde.id,
          zeitraumVon: von,
          zeitraumBis: bis,
          datum: new Date(),
          status: "Entwurf",
          nettoBetrag: netto,
          mwstBetrag: netto.mul(0.07),
          bruttoBetrag: netto.mul(1.07),
          lieferscheine: { connect: lsForKunde.map((l) => ({ id: l.id })) },
        },
      }));

    const pdfRes2 = await check(
      "admin GET /pdf/rechnung/{id} (entwurf)",
      `${base}/pdf/rechnung/${r.id}`,
      adminCookie,
      { status: 200, contentType: "application/pdf" }
    );
    if (pdfRes2.status === 200) {
      const bytes = Buffer.from(await pdfRes2.arrayBuffer());
      console.log(`   pdf size: ${bytes.length} bytes; magic: ${bytes.slice(0, 5).toString()}`);
    }
  }

  await prisma.$disconnect();
  console.log("\nsmoke test done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
