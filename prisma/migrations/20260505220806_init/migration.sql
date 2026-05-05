-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'FAHRER');

-- CreateEnum
CREATE TYPE "LieferscheinStatus" AS ENUM ('Entwurf', 'Unterschrieben', 'Versendet');

-- CreateEnum
CREATE TYPE "RechnungStatus" AS ENUM ('Entwurf', 'Freigegeben', 'Versendet');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'FAHRER',
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kunde" (
    "id" TEXT NOT NULL,
    "gln" TEXT,
    "kuerzel" TEXT NOT NULL,
    "firmenname" TEXT NOT NULL,
    "addressname" TEXT,
    "ansprechpartner" TEXT,
    "adresse" TEXT NOT NULL,
    "plz" TEXT NOT NULL,
    "ort" TEXT NOT NULL,
    "email" TEXT,
    "telefon" TEXT,
    "filialnummer" TEXT,
    "notizen" TEXT,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kunde_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produkt" (
    "id" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "ean13" TEXT NOT NULL,
    "standardpreis" DECIMAL(10,2) NOT NULL,
    "mwstSatz" DECIMAL(5,2) NOT NULL,
    "einheit" TEXT NOT NULL DEFAULT 'Packung',
    "packungsgroesse" INTEGER NOT NULL DEFAULT 1,
    "packungenProKiste" INTEGER NOT NULL DEFAULT 1,
    "reihenfolge" INTEGER NOT NULL DEFAULT 0,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Produkt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KundeProduktPreis" (
    "id" TEXT NOT NULL,
    "kundeId" TEXT NOT NULL,
    "produktId" TEXT NOT NULL,
    "sonderpreis" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KundeProduktPreis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lieferschein" (
    "id" TEXT NOT NULL,
    "nummer" TEXT NOT NULL,
    "kundeId" TEXT NOT NULL,
    "fahrerId" TEXT NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL,
    "mhd" TIMESTAMP(3) NOT NULL,
    "status" "LieferscheinStatus" NOT NULL DEFAULT 'Entwurf',
    "unterschrift" TEXT,
    "bemerkung" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lieferschein_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LieferscheinPosition" (
    "id" TEXT NOT NULL,
    "lieferscheinId" TEXT NOT NULL,
    "produktId" TEXT NOT NULL,
    "packungen" INTEGER NOT NULL,
    "preis" DECIMAL(10,2) NOT NULL,
    "reihenfolge" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LieferscheinPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rechnung" (
    "id" TEXT NOT NULL,
    "nummer" TEXT NOT NULL,
    "kundeId" TEXT NOT NULL,
    "zeitraumVon" TIMESTAMP(3) NOT NULL,
    "zeitraumBis" TIMESTAMP(3) NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "RechnungStatus" NOT NULL DEFAULT 'Entwurf',
    "nettoBetrag" DECIMAL(12,2) NOT NULL,
    "mwstBetrag" DECIMAL(12,2) NOT NULL,
    "bruttoBetrag" DECIMAL(12,2) NOT NULL,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rechnung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LieferscheinStatusLog" (
    "id" TEXT NOT NULL,
    "lieferscheinId" TEXT NOT NULL,
    "fromStatus" "LieferscheinStatus",
    "toStatus" "LieferscheinStatus" NOT NULL,
    "userId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LieferscheinStatusLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RechnungStatusLog" (
    "id" TEXT NOT NULL,
    "rechnungId" TEXT NOT NULL,
    "fromStatus" "RechnungStatus",
    "toStatus" "RechnungStatus" NOT NULL,
    "userId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RechnungStatusLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Counter" (
    "id" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Einstellungen" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "firmenname" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "plz" TEXT NOT NULL,
    "ort" TEXT NOT NULL,
    "telefon" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "steuernr" TEXT NOT NULL,
    "bankname" TEXT NOT NULL,
    "iban" TEXT NOT NULL,
    "bic" TEXT NOT NULL,
    "defaultBemerkung" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Einstellungen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_RechnungLieferscheine" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RechnungLieferscheine_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Kunde_gln_key" ON "Kunde"("gln");

-- CreateIndex
CREATE INDEX "Kunde_firmenname_idx" ON "Kunde"("firmenname");

-- CreateIndex
CREATE UNIQUE INDEX "Produkt_ean13_key" ON "Produkt"("ean13");

-- CreateIndex
CREATE INDEX "Produkt_reihenfolge_idx" ON "Produkt"("reihenfolge");

-- CreateIndex
CREATE UNIQUE INDEX "KundeProduktPreis_kundeId_produktId_key" ON "KundeProduktPreis"("kundeId", "produktId");

-- CreateIndex
CREATE UNIQUE INDEX "Lieferschein_nummer_key" ON "Lieferschein"("nummer");

-- CreateIndex
CREATE INDEX "Lieferschein_kundeId_idx" ON "Lieferschein"("kundeId");

-- CreateIndex
CREATE INDEX "Lieferschein_fahrerId_idx" ON "Lieferschein"("fahrerId");

-- CreateIndex
CREATE INDEX "Lieferschein_datum_idx" ON "Lieferschein"("datum");

-- CreateIndex
CREATE UNIQUE INDEX "Rechnung_nummer_key" ON "Rechnung"("nummer");

-- CreateIndex
CREATE INDEX "Rechnung_kundeId_idx" ON "Rechnung"("kundeId");

-- CreateIndex
CREATE INDEX "Rechnung_datum_idx" ON "Rechnung"("datum");

-- CreateIndex
CREATE INDEX "LieferscheinStatusLog_lieferscheinId_createdAt_idx" ON "LieferscheinStatusLog"("lieferscheinId", "createdAt");

-- CreateIndex
CREATE INDEX "RechnungStatusLog_rechnungId_createdAt_idx" ON "RechnungStatusLog"("rechnungId", "createdAt");

-- CreateIndex
CREATE INDEX "_RechnungLieferscheine_B_index" ON "_RechnungLieferscheine"("B");

-- AddForeignKey
ALTER TABLE "KundeProduktPreis" ADD CONSTRAINT "KundeProduktPreis_kundeId_fkey" FOREIGN KEY ("kundeId") REFERENCES "Kunde"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KundeProduktPreis" ADD CONSTRAINT "KundeProduktPreis_produktId_fkey" FOREIGN KEY ("produktId") REFERENCES "Produkt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lieferschein" ADD CONSTRAINT "Lieferschein_kundeId_fkey" FOREIGN KEY ("kundeId") REFERENCES "Kunde"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lieferschein" ADD CONSTRAINT "Lieferschein_fahrerId_fkey" FOREIGN KEY ("fahrerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LieferscheinPosition" ADD CONSTRAINT "LieferscheinPosition_lieferscheinId_fkey" FOREIGN KEY ("lieferscheinId") REFERENCES "Lieferschein"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LieferscheinPosition" ADD CONSTRAINT "LieferscheinPosition_produktId_fkey" FOREIGN KEY ("produktId") REFERENCES "Produkt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rechnung" ADD CONSTRAINT "Rechnung_kundeId_fkey" FOREIGN KEY ("kundeId") REFERENCES "Kunde"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LieferscheinStatusLog" ADD CONSTRAINT "LieferscheinStatusLog_lieferscheinId_fkey" FOREIGN KEY ("lieferscheinId") REFERENCES "Lieferschein"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LieferscheinStatusLog" ADD CONSTRAINT "LieferscheinStatusLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RechnungStatusLog" ADD CONSTRAINT "RechnungStatusLog_rechnungId_fkey" FOREIGN KEY ("rechnungId") REFERENCES "Rechnung"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RechnungStatusLog" ADD CONSTRAINT "RechnungStatusLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RechnungLieferscheine" ADD CONSTRAINT "_RechnungLieferscheine_A_fkey" FOREIGN KEY ("A") REFERENCES "Lieferschein"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RechnungLieferscheine" ADD CONSTRAINT "_RechnungLieferscheine_B_fkey" FOREIGN KEY ("B") REFERENCES "Rechnung"("id") ON DELETE CASCADE ON UPDATE CASCADE;

